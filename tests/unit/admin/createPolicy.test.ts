import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "drizzle-orm/pg-core";
import type { saveRecord } from "@kenstack/records";

const mocks = vi.hoisted(() => ({
  saveRecord: vi.fn(async (options: Parameters<typeof saveRecord>[0]) => ({
    status: "success" as const,
    row: { id: options.id ?? 1 },
    values: options.values,
  })),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@kenstack/records", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/records")>()),
  saveRecord: mocks.saveRecord,
}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { defineTable } from "@kenstack/admin/table";
import { textField } from "@kenstack/fields";

const table = defineTable({
  name: "create_policy_notes",
  columns: { note: text("note").notNull() },
});
const fields = defineFields({ fields: { note: textField() } });
const updateOnly = defineModule({
  name: "update-only-notes",
  admin: { create: false, fields, table, list: {} },
});

describe("admin creation policy", () => {
  beforeEach(() => {
    mocks.saveRecord.mockClear();
  });

  it("rejects creation before persistence for an update-only module", async () => {
    expect(updateOnly.admin.create).toBe(false);
    expect(
      await saveAdminRecord({
        module: updateOnly,
        values: { note: "Staff note" },
      }),
    ).toMatchObject({ status: "error" });
    expect(mocks.saveRecord).not.toHaveBeenCalled();
  });

  it("preserves updates in an update-only module", async () => {
    expect(
      await saveAdminRecord({
        id: 1,
        module: updateOnly,
        values: { note: "Staff note" },
      }),
    ).toMatchObject({ status: "success" });
    expect(mocks.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
    );
  });

  it("allows creation by default for existing modules", async () => {
    const moduleConfig = defineModule({
      name: "ordinary-notes",
      admin: { fields, table, list: {} },
    });
    expect(moduleConfig.admin).toMatchObject({ create: true });
    expect(
      await saveAdminRecord({
        module: moduleConfig,
        values: { note: "New note" },
      }),
    ).toMatchObject({ status: "success" });
    expect(mocks.saveRecord).toHaveBeenCalledOnce();
  });
});
