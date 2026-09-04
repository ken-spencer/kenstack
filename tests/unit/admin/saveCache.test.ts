import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect, text } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  events: [] as string[],
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
    list: {},
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
      const result = await run(tx);
      mocks.events.push("commit");
      return result;
    },
  );
  return update;
}

describe("shared module cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.events.length = 0;
    mocks.audit.mockResolvedValue(undefined);
    mocks.revalidateTag.mockImplementation(() =>
      mocks.events.push("invalidate"),
    );
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
          ? await saveModuleRecord({
              ...options,
              fields: moduleConfig.admin.fields,
            })
          : await saveAdminRecord(options);
      expect(result).toMatchObject({ status: "success" });
      expect(mocks.events).toEqual([
        "commit",
        "invalidate",
        "invalidate",
        "invalidate",
      ]);
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
        fields: moduleConfig.admin.fields,
        values: { name: "Updated" },
      }),
    ).rejects.toThrow("Audit unavailable");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-load:users:12", {
      expire: 0,
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-list:users", {
      expire: 0,
    });
    expect(mocks.revalidateTag.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.audit.mock.invocationCallOrder[0],
    );
  });

  it("does not invalidate when the transaction fails", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("Transaction failed"));
    await expect(
      saveModuleRecord({
        id: 12,
        module: moduleConfig,
        fields: moduleConfig.admin.fields,
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
        fieldServers: {
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
        list: {},
      },
    });

    await expect(
      saveModuleRecord({
        id: 12,
        module: moduleWithCleanup,
        fields: moduleWithCleanup.admin.fields,
        values: { name: "Updated" },
      }),
    ).rejects.toThrow("Revalidation failed");
    expect(mocks.revalidateTag).toHaveBeenCalledWith("admin-load:users:12", {
      expire: 0,
    });
    expect(afterCommit).toHaveBeenCalledOnce();
    expect(afterFailure).not.toHaveBeenCalled();
    expect(mocks.revalidateTag.mock.invocationCallOrder[0]).toBeLessThan(
      afterCommit.mock.invocationCallOrder[0],
    );
  });

  it("excludes soft-deleted records from public updates and reports a missing row", async () => {
    const update = useDatabaseRows([]);
    expect(
      await saveModuleRecord({
        id: 12,
        module: moduleConfig,
        fields: moduleConfig.admin.fields,
        values: { name: "Updated" },
      }),
    ).toMatchObject({ status: "error" });
    expect(
      new PgDialect().sqlToQuery(update.where.mock.calls[0][0]).sql,
    ).toContain('"deleted_at" is null');
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
