import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableColumns } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({
  deps: {
    auth: {
      requireUser: vi.fn(async () => ({ id: 1 })),
    },
    db: {
      transaction: mocks.transaction,
    },
    logger: {
      audit: mocks.audit,
    },
  },
}));

import { textField } from "@kenstack/fields/client";
import { defineFields } from "@kenstack/admin/fields";
import {
  prepareRecordFields,
  saveRecord,
} from "@kenstack/fields/records/saveRecord";
import { serverFields } from "@kenstack/fields/server";

const records = pgTable("save_record_lifecycle_records", {
  id: integer().primaryKey(),
  first: text(),
  second: text(),
  title: text(),
});

describe("record preparation lifecycle", () => {
  beforeEach(() => {
    mocks.audit.mockReset();
    mocks.transaction.mockReset();
  });

  it("cleans up earlier preparation when a later field rejects", async () => {
    const afterFailure = vi.fn(async () => {});
    const fields = serverFields(
      defineFields({
        fields: {
          first: textField(),
          second: textField(),
        },
      }),
      {
        first: {
          async prepareSave() {
            return {
              status: "success" as const,
              afterFailure: [afterFailure],
            };
          },
        },
        second: {
          async prepareSave() {
            return {
              status: "error" as const,
              message: "Second field rejected",
            };
          },
        },
      },
    );

    const result = await prepareRecordFields({
      admin: true,
      columns: getTableColumns(records),
      fields,
      shouldSaveField: () => true,
      table: records,
      user: { id: 1 } as never,
      values: {
        first: "prepared",
        second: "invalid",
      },
    });

    expect(result).toMatchObject({
      status: "error",
      message: "Second field rejected",
    });
    expect(afterFailure).toHaveBeenCalledOnce();
  });

  it("keeps unchanged siblings available while preparing changed fields", async () => {
    const prepareSave = vi.fn(async ({ values }) => {
      expect(values).toEqual({
        first: "changed",
        second: "unchanged",
      });
      return { status: "success" as const };
    });
    const fields = serverFields(
      defineFields({
        fields: {
          first: textField(),
          second: textField(),
        },
      }),
      {
        first: { prepareSave },
      },
    );

    await prepareRecordFields({
      admin: true,
      columns: getTableColumns(records),
      fields,
      shouldSaveField: (key) => key === "first",
      table: records,
      user: { id: 1 } as never,
      values: {
        first: "changed",
        second: "unchanged",
      },
    });

    expect(prepareSave).toHaveBeenCalledOnce();
  });

  it("cleans up related preparation when parent preparation rejects", async () => {
    const afterFailure = vi.fn(async () => {});
    const relatedFields = serverFields(
      defineFields({
        fields: {
          first: textField(),
        },
      }),
      {
        first: {
          async prepareSave() {
            return {
              status: "success" as const,
              afterFailure: [afterFailure],
            };
          },
        },
      },
    );
    const related = await prepareRecordFields({
      admin: true,
      columns: getTableColumns(records),
      fields: relatedFields,
      shouldSaveField: () => true,
      table: records,
      user: { id: 1 } as never,
      values: { first: "prepared" },
    });
    if (related.status === "error") {
      throw new Error(related.message);
    }
    const parentFields = serverFields(
      defineFields({
        fields: {
          title: textField(),
        },
      }),
      {
        title: {
          async prepareSave() {
            return {
              status: "error" as const,
              message: "Parent field rejected",
            };
          },
        },
      },
    );

    const result = await saveRecord({
      actionPrefix: "admin",
      additionalPreparations: [related],
      admin: true,
      fields: parentFields,
      table: records,
      values: { title: "Rejected" },
    });

    expect(result).toMatchObject({
      status: "error",
      error: "Parent field rejected",
    });
    expect(afterFailure).toHaveBeenCalledOnce();
  });

  it("cleans up related preparation when authentication fails", async () => {
    const afterFailure = vi.fn(async () => {});
    const fields = serverFields(
      defineFields({
        fields: {
          first: textField(),
        },
      }),
      {
        first: {
          async prepareSave() {
            return {
              status: "success" as const,
              afterFailure: [afterFailure],
            };
          },
        },
      },
    );
    const related = await prepareRecordFields({
      admin: true,
      columns: getTableColumns(records),
      fields,
      shouldSaveField: () => true,
      table: records,
      user: { id: 1 } as never,
      values: { first: "prepared" },
    });
    if (related.status === "error") {
      throw new Error(related.message);
    }

    const { deps } = await import("@app/deps");
    vi.mocked(deps.auth.requireUser).mockRejectedValueOnce(
      new Error("Session expired"),
    );

    await expect(
      saveRecord({
        actionPrefix: "admin",
        additionalPreparations: [related],
        admin: true,
        fields: {},
        table: records,
        values: { title: "Saved" },
      }),
    ).rejects.toThrow("Session expired");

    expect(afterFailure).toHaveBeenCalledOnce();
  });

  it("commits related preparation before a later audit failure", async () => {
    const afterCommit = vi.fn(async () => {});
    const afterFailure = vi.fn(async () => {});
    const fields = serverFields(
      defineFields({
        fields: {
          first: textField(),
        },
      }),
      {
        first: {
          async prepareSave() {
            return {
              status: "success" as const,
              afterCommit: [afterCommit],
              afterFailure: [afterFailure],
            };
          },
        },
      },
    );
    const related = await prepareRecordFields({
      admin: true,
      columns: getTableColumns(records),
      fields,
      shouldSaveField: () => true,
      table: records,
      user: { id: 1 } as never,
      values: { first: "prepared" },
    });
    if (related.status === "error") {
      throw new Error(related.message);
    }

    const tx = {
      insert: () => ({
        values: vi.fn(async () => []),
      }),
    };
    mocks.transaction.mockImplementation(async (callback) => callback(tx));
    mocks.audit.mockRejectedValueOnce(new Error("Audit unavailable"));

    await expect(
      saveRecord({
        actionPrefix: "admin",
        additionalPreparations: [related],
        admin: true,
        fields: {},
        query: async () => ({ id: 1, title: "Saved" }),
        revisionChanges: ["first"],
        table: records,
        values: { title: "Saved" },
      }),
    ).rejects.toThrow("Audit unavailable");

    expect(afterCommit).toHaveBeenCalledOnce();
    expect(afterFailure).not.toHaveBeenCalled();
  });
});
