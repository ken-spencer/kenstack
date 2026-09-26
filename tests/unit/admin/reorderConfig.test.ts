import { describe, expect, it, vi } from "vitest";
import { boolean, integer, text } from "drizzle-orm/pg-core";
import * as z from "zod";

vi.mock("server-only", () => ({}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineAdmin } from "@kenstack/admin/server";
import { defineTable } from "@kenstack/admin/table";
import type { AdminSort } from "@kenstack/admin/types/list";
import { field, textField } from "@kenstack/fields";
import { serverField } from "@kenstack/fields/server";

const categories = defineTable({
  name: "reorder_config_categories",
  reorder: true,
  columns: {
    name: text("name").notNull(),
  },
});

const products = defineTable({
  name: "reorder_config_products",
  reorder: true,
  columns: {
    active: boolean("active").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    optionalCategoryId: integer("optional_category_id"),
    name: text("name").notNull(),
  },
});

const categoryIdField = field({
  default: 0,
  kind: "test-category-id",
  zod: z.number().int().positive(),
});

const fields = defineFields({
  fields: {
    categoryId: categoryIdField,
    name: textField(),
  },
});

const categoryFields = defineFields({
  fields: {
    name: textField(),
  },
});

describe("scoped admin reordering", () => {
  it("inherits the related module's default id tie-break direction", () => {
    const alphabeticalCategories = defineTable({
      name: "alphabetical_reorder_config_categories",
      columns: {
        name: text("name").notNull(),
      },
    });
    const alphabeticalProducts = defineTable({
      name: "alphabetical_reorder_config_products",
      reorder: true,
      columns: {
        categoryId: integer("category_id")
          .notNull()
          .references(() => alphabeticalCategories.id),
        name: text("name").notNull(),
      },
    });
    const alphabeticalCategoryFields = defineFields({
      fields: {
        name: textField({ sort: true }),
      },
    });
    const categoryModule = defineModule({
      name: "alphabetical-categories",
      admin: {
        fields: alphabeticalCategoryFields,
        table: alphabeticalCategories,
      },
    });
    const productModule = defineModule({
      name: "alphabetical-products",
      admin: {
        fields,
        table: alphabeticalProducts,
        list: {
          reorder: {
            scope: alphabeticalProducts.categoryId,
          },
        },
      },
    });

    const admin = defineAdmin([categoryModule, productModule])[
      productModule.name
    ]?.admin;
    if (!admin || !("list" in admin) || !("sort" in admin.list)) {
      throw new Error("Expected a resolved product list.");
    }
    const reorderSort: AdminSort[string] | undefined = admin.list.sort.reorder;
    if (!reorderSort) {
      throw new Error("Expected a reorder sort.");
    }

    expect(reorderSort.fields).toMatchObject([
      { direction: "asc" },
      { field: alphabeticalProducts.categoryId, direction: "desc" },
      alphabeticalProducts.sortOrder,
    ]);
  });

  it("rejects a scope column from another table", () => {
    const otherCategories = defineTable({
      name: "other_reorder_config_categories",
      columns: {
        name: text("name").notNull(),
      },
    });

    expect(() =>
      defineModule({
        name: "invalid-reorder-config-products",
        admin: {
          fields,
          table: products,
          list: {
            reorder: {
              scope: otherCategories.id,
            },
          },
        },
      }),
    ).toThrow();
  });

  it("rejects a nullable scope column", () => {
    expect(() =>
      defineModule({
        name: "nullable-reorder-scope-products",
        admin: {
          fields,
          table: products,
          list: {
            reorder: {
              scope: products.optionalCategoryId,
            },
          },
        },
      }),
    ).toThrow();
  });

  it("rejects a non-number scope column", () => {
    expect(() =>
      defineModule({
        name: "non-number-reorder-scope-products",
        admin: {
          fields,
          table: products,
          list: {
            reorder: {
              scope: products.active,
            },
          },
        },
      }),
    ).toThrow();
  });

  it("rejects a scope column absent from the module fields", () => {
    const nameOnlyFields = defineFields({
      fields: {
        name: textField(),
      },
    });

    expect(() =>
      defineModule({
        name: "missing-reorder-scope-products",
        admin: {
          fields: nameOnlyFields,
          table: products,
          list: {
            reorder: {
              scope: products.categoryId,
            },
          },
        },
      }),
    ).toThrow();
  });

  it("rejects custom save behavior on the scope field", () => {
    expect(() =>
      defineModule({
        name: "custom-save-reorder-scope-products",
        admin: {
          fields,
          fieldServers: {
            categoryId: serverField(categoryIdField, () => ({
              save: async ({ value }) => value,
            })),
          },
          table: products,
          list: {
            reorder: {
              scope: products.categoryId,
            },
          },
        },
      }),
    ).toThrow();
  });

  it("accepts child reorder without an explicit scope", () => {
    const categoryModule = defineModule({
      name: "categories",
      admin: {
        fields: categoryFields,
        table: categories,
      },
    });
    const childModule = defineModule({
      name: "child-reorder-scope-products",
      parent: {
        module: "categories",
        foreignKey: "categoryId",
      },
      admin: {
        fields,
        table: products,
        list: {
          reorder: true,
        },
      },
    });

    expect(() => defineAdmin([categoryModule, childModule])).not.toThrow();
  });

  it("rejects an explicit scope when the registry makes a module a child", () => {
    const categoryModule = defineModule({
      name: "categories",
      admin: {
        fields: categoryFields,
        table: categories,
      },
    });
    const childModule = defineModule({
      name: "child-reorder-scope-products",
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

    expect(() =>
      defineAdmin([
        {
          module: categoryModule,
          children: [{ module: childModule, foreignKey: "categoryId" }],
        },
      ]),
    ).toThrow();
  });

  it("requires the foreign-key target to have one registered list module", () => {
    const moduleConfig = defineModule({
      name: "products-without-category-module",
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

    expect(() => defineAdmin([moduleConfig])).toThrow();
  });

  it("requires the scope field to define one foreign key", () => {
    const unreferencedProducts = defineTable({
      name: "unreferenced_reorder_config_products",
      reorder: true,
      columns: {
        categoryId: integer("category_id").notNull(),
        name: text("name").notNull(),
      },
    });
    const moduleConfig = defineModule({
      name: "unreferenced-products",
      admin: {
        fields,
        table: unreferencedProducts,
        list: {
          reorder: {
            scope: unreferencedProducts.categoryId,
          },
        },
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow();
  });
});
