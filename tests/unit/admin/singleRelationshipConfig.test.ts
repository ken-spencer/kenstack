import { describe, expect, it, vi } from "vitest";
import { integer, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineAdmin } from "@kenstack/admin/server";
import { defineTable } from "@kenstack/admin/table";
import { relationshipField, textField } from "@kenstack/fields";

const categories = defineTable({
  name: "single_relationship_categories",
  columns: { name: text("name").notNull() },
});

const products = defineTable({
  name: "single_relationship_products",
  columns: {
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
  },
});

const categoryModule = defineModule({
  name: "single-relationship-categories",
  admin: {
    fields: defineFields({ fields: { name: textField() } }),
    table: categories,
    list: {},
  },
});

function productModule(table = products) {
  return defineModule({
    name: "single-relationship-products",
    admin: {
      fields: defineFields({
        fields: {
          categoryId: relationshipField({ mode: "single" }),
          name: textField(),
        },
      }),
      table,
      list: {},
    },
  });
}

describe("single relationship configuration", () => {
  it("accepts a scalar foreign key with one registered list target", () => {
    expect(() => defineAdmin([categoryModule, productModule()])).not.toThrow();
  });

  it("rejects a relationship without a foreign key", () => {
    const unreferencedProducts = defineTable({
      name: "single_relationship_unreferenced_products",
      columns: {
        categoryId: integer("category_id").notNull(),
        name: text("name").notNull(),
      },
    });

    const unreferencedModule = defineModule({
      name: "single-relationship-unreferenced-products",
      admin: {
        fields: defineFields({
          fields: {
            categoryId: relationshipField({ mode: "single" }),
            name: textField(),
          },
        }),
        table: unreferencedProducts,
        list: {},
      },
    });

    expect(() => defineAdmin([categoryModule, unreferencedModule])).toThrow(
      /has 0 matching single-column foreign keys/,
    );
  });

  it("rejects a foreign key whose target has no registered list module", () => {
    expect(() => defineAdmin([productModule()])).toThrow(
      /has 0 registered list modules/,
    );
  });
});
