import { beforeEach, describe, expect, it, vi } from "vitest";
import { integer, text } from "drizzle-orm/pg-core";
import * as z from "zod";
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
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));
vi.mock("@kenstack/records", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/records")>()),
  saveRecord: mocks.saveRecord,
}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { defineTable } from "@kenstack/admin/table";
import { field, textField } from "@kenstack/fields";

const categories = defineTable({
  name: "reorder_save_categories",
  columns: {
    name: text("name").notNull(),
  },
});

const products = defineTable({
  name: "reorder_save_products",
  reorder: true,
  columns: {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
  },
});

const fields = defineFields({
  fields: {
    categoryId: field({
      default: 0,
      kind: "test-category-id",
      zod: z.number().int().positive(),
    }),
    name: textField(),
  },
});

const moduleConfig = defineModule({
  name: "reorder-save-products",
  admin: {
    fields,
    table: products,
    list: {
      reorder: {
        scope: products.categoryId,
      },
    },
  },
});

describe("scoped reorder saves", () => {
  beforeEach(() => {
    mocks.saveRecord.mockClear();
  });

  it("appends new records", async () => {
    await saveAdminRecord({
      module: moduleConfig,
      values: { categoryId: 1, name: "Popcorn" },
    });

    expect(mocks.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.any(Function) }),
    );
  });

  it("appends an existing record when its scope changes", async () => {
    await saveAdminRecord({
      changes: ["categoryId"],
      id: 1,
      module: moduleConfig,
      values: { categoryId: 2, name: "Popcorn" },
    });

    expect(mocks.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.any(Function) }),
    );
  });

  it("preserves order when another field changes", async () => {
    await saveAdminRecord({
      changes: ["name"],
      id: 1,
      module: moduleConfig,
      values: { categoryId: 1, name: "Popcorn" },
    });

    expect(mocks.saveRecord.mock.calls[0]?.[0]).not.toHaveProperty("query");
  });

  it("checks the stored scope when changes are unavailable", async () => {
    await saveAdminRecord({
      id: 1,
      module: moduleConfig,
      values: { categoryId: 1, name: "Popcorn" },
    });

    expect(mocks.saveRecord).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.any(Function) }),
    );
  });

  it("preserves order when changes and the scope value are unavailable", async () => {
    await saveAdminRecord({
      id: 1,
      module: moduleConfig,
      values: { name: "Popcorn" },
    });

    expect(mocks.saveRecord.mock.calls[0]?.[0]).not.toHaveProperty("query");
  });
});
