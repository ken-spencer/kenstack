import { beforeEach, describe, expect, it, vi } from "vitest";
import { text } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  insertValues: vi.fn(),
  revalidateTag: vi.fn(),
  transaction: vi.fn(),
  updateSet: vi.fn(),
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
import { defineKeyTable } from "@kenstack/admin/table";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { textField } from "@kenstack/fields";

const settings = defineKeyTable({
  name: "key_save_test_settings",
  columns: {
    title: text().notNull(),
    contactEmail: text("contact_email").notNull(),
  },
});
const moduleConfig = defineModule({
  name: "settings",
  admin: {
    table: settings,
    fields: defineFields({
      fields: { title: textField(), contactEmail: textField() },
    }),
  },
});
const values = { title: "Site", contactEmail: "new@example.com" };

describe("key table save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.audit.mockResolvedValue(undefined);
    const row = { id: 1, ...values };
    mocks.insertValues.mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([row]),
    });
    mocks.updateSet.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([row]),
    });
    const tx = {
      insert: vi.fn(() => ({ values: mocks.insertValues })),
      update: vi.fn(() => ({ set: mocks.updateSet })),
    };
    mocks.transaction.mockImplementation(
      async (run: (database: typeof tx) => Promise<unknown>) => run(tx),
    );
  });

  it("inserts the full row when the record does not exist yet", async () => {
    const result = await saveAdminRecord({
      changes: ["contactEmail"],
      module: moduleConfig,
      values,
    });

    expect(result.status).toBe("success");
    expect(mocks.updateSet).not.toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ key: "settings", ...values }),
    );
  });

  it("updates only the changed columns once the record exists", async () => {
    const result = await saveAdminRecord({
      changes: ["contactEmail"],
      id: 1,
      module: moduleConfig,
      values,
    });

    expect(result.status).toBe("success");
    expect(mocks.insertValues).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: "settings" }),
    );
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.not.objectContaining({ title: "Site" }),
    );
    expect(mocks.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ contactEmail: "new@example.com" }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({ data: { changes: ["contactEmail"] } }),
    );
  });
});
