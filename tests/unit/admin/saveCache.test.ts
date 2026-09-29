import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  revalidateTag: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@kenstack/auth/server/user", () => ({
  requireUser: vi.fn(async () => ({ id: 12 })),
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import {
  saveAdminRecord,
  saveModuleRecord,
} from "@kenstack/admin/queries/save";
import { textField } from "@kenstack/fields";
import { serverField } from "@kenstack/fields/server";

const users = defineTable({
  name: "cache_test_users",
  columns: { name: text().notNull() },
});
const moduleConfig = defineModule({
  name: "users",
  admin: {
    table: users,
    fields: defineFields({ fields: { name: textField() } }),
    revalidate: ["public-user-names"],
  },
});

function useDatabaseRows(rows = [{ id: 12, name: "Updated" }]) {
  const update = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  const tx = {
    update: vi.fn(() => update),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue([]) })),
  };
  mocks.transaction.mockImplementation(
    async (run: (database: typeof tx) => Promise<unknown>) => {
      return run(tx);
    },
  );
}

describe("shared module cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.audit.mockResolvedValue(undefined);
    useDatabaseRows();
  });

  it.each(["public", "admin"])(
    "expires record, list, and module dependencies after a %s save",
    async (source) => {
      const options = {
        id: 12,
        module: moduleConfig,
        values: { name: "Updated" },
      };
      const result =
        source === "public"
          ? await saveModuleRecord(options)
          : await saveAdminRecord(options);
      expect(result).toMatchObject({ status: "success" });
      for (const tag of [
        "admin-load:users:12",
        "admin-list:users",
        "public-user-names",
      ]) {
        expect(mocks.revalidateTag).toHaveBeenCalledWith(tag, { expire: 0 });
      }
    },
  );

  it("expires committed data before an audit failure", async () => {
    mocks.audit.mockRejectedValueOnce(new Error("Audit unavailable"));
    await expect(
      saveModuleRecord({
        id: 12,
        module: moduleConfig,
        values: { name: "Updated" },
      }),
    ).rejects.toThrow("Audit unavailable");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-load:users:12", {
      expire: 0,
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-list:users", {
      expire: 0,
    });
  });

  it("does not invalidate when the transaction fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("Transaction failed"));
    await expect(
      saveModuleRecord({
        id: 12,
        module: moduleConfig,
        values: { name: "Updated" },
      }),
    ).rejects.toThrow("Transaction failed");
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("runs committed field cleanup even if a revalidation callback throws", async () => {
    const afterCommit = vi.fn(async () => {});
    const afterFailure = vi.fn(async () => {});
    const fields = defineFields({ fields: { name: textField() } });
    const moduleWithCleanup = defineModule({
      name: "users",
      admin: {
        table: users,
        fields,
        serverFields: {
          name: serverField(fields.name, () => ({
            async prepareSave() {
              return {
                status: "success",
                afterCommit: [afterCommit],
                afterFailure: [afterFailure],
              };
            },
          })),
        },
        revalidate: [
          () => {
            throw new Error("Revalidation failed");
          },
        ],
      },
    });

    await expect(
      saveModuleRecord({
        id: 12,
        module: moduleWithCleanup,
        values: { name: "Updated" },
      }),
    ).rejects.toThrow("Revalidation failed");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-load:users:12", {
      expire: 0,
    });
    expect(afterCommit).toHaveBeenCalledOnce();
    expect(afterFailure).not.toHaveBeenCalled();
  });

  it("reports a missing row without invalidating", async () => {
    useDatabaseRows([]);
    expect(
      await saveModuleRecord({
        id: 12,
        module: moduleConfig,
        values: { name: "Updated" },
      }),
    ).toMatchObject({ status: "error" });
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
