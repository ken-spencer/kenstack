import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: { select: mocks.select, update: mocks.update },
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@kenstack/api", () => ({
  pipelineStage: (_options: unknown, callback: unknown) => callback,
}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import { removeAction } from "@kenstack/admin/api/remove";
import { textField } from "@kenstack/fields";

const table = defineTable({
  name: "remove_cache_users",
  columns: { name: text().notNull() },
});
const usersModule = defineModule({
  name: "users",
  admin: {
    table,
    fields: defineFields({ fields: { name: textField() } }),
    list: {},
  },
});

describe("user removal cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([{ id: 12, name: "Patron" }]),
      })),
    });
    mocks.update.mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })),
    });
    mocks.audit.mockResolvedValue(undefined);
  });

  it.each(["trash", "restore"])(
    "expires the user record and list on %s without module callbacks",
    async (mode) => {
      await removeAction(usersModule)({
        data: { remove: [12], mode },
        response: { success: vi.fn(), error: vi.fn() },
        user: { id: 1 },
      } as never);
      expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-load:users:12", {
        expire: 0,
      });
      expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-list:users", {
        expire: 0,
      });
      expect(mocks.revalidateTag.mock.invocationCallOrder[0]).toBeGreaterThan(
        mocks.update.mock.invocationCallOrder[0],
      );
      expect(mocks.revalidateTag.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.audit.mock.invocationCallOrder[0],
      );
    },
  );

  it("expires the record before custom invalidation can fail", async () => {
    const moduleConfig = defineModule({
      name: "users",
      admin: {
        table,
        fields: defineFields({ fields: { name: textField() } }),
        revalidate: [
          () => {
            throw new Error("Custom rule failed");
          },
        ],
        list: {},
      },
    });
    await expect(
      removeAction(moduleConfig)({
        data: { remove: [12], mode: "trash" },
        response: { success: vi.fn(), error: vi.fn() },
        user: { id: 1 },
      } as never),
    ).rejects.toThrow("Custom rule failed");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-load:users:12", {
      expire: 0,
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-list:users", {
      expire: 0,
    });
  });
});
