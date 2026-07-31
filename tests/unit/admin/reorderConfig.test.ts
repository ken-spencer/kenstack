import { describe, expect, it, vi } from "vitest";
import {
  boolean,
  integer,
  pgTable,
  PgDialect,
  text,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import * as z from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineAdmin } from "@kenstack/admin/server";
import { defineTable } from "@kenstack/admin/table";
import type { AdminSort } from "@kenstack/admin/types/list";
import { field, textField } from "@kenstack/fields/client";
import { serverFields } from "@kenstack/fields/server";

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

const fields = defineFields({
  fields: {
    categoryId: field({
      default: 0,
      kind: "custom",
      zod: z.number().int().positive(),
    }),
    name: textField(),
  },
});

const categoryFields = defineFields({
  fields: {
    name: textField(),
  },
});

describe("scoped admin reordering", () => {
  it("inherits its group heading, link, and order from the related module", () => {
    const categoryModule = defineModule({
      name: "categories",
      admin: {
        fields: serverFields(categoryFields),
        table: categories,
        list: {
          reorder: true,
        },
      },
    });
    const moduleConfig = defineModule({
      name: "reorder-config-products",
      admin: {
        fields: serverFields(fields),
        table: products,
        list: {
          reorder: {
            label: "Catalogue order",
            scope: products.categoryId,
          },
        },
      },
    });

    const admin = defineAdmin([categoryModule, moduleConfig])[moduleConfig.name]
      ?.admin;
    if (!admin || !("list" in admin) || !("sort" in admin.list)) {
      throw new Error("Expected resolved list configuration.");
    }

    expect(admin.list.reorder).toEqual({
      field: products.sortOrder,
      fieldKey: "sortOrder",
      label: "Catalogue order",
      scope: {
        field: products.categoryId,
        fieldKey: "categoryId",
      },
    });
    const reorderSort: AdminSort[string] | undefined = admin.list.sort.reorder;
    if (!reorderSort) {
      throw new Error("Expected a reorder sort.");
    }
    expect(reorderSort).toMatchObject({
      label: "Catalogue order",
      fields: [
        {
          direction: "asc",
        },
        {
          field: products.categoryId,
          direction: "asc",
        },
        products.sortOrder,
      ],
      defaultDirection: "asc",
      direction: false,
    });
    expect(reorderSort.group).toEqual({
      by: "categoryId",
      label: "category",
      link: "categories",
    });

    const relatedOrder = reorderSort.fields[0];
    if (!("field" in relatedOrder)) {
      throw new Error("Expected a related order expression.");
    }
    expect(
      new PgDialect().sqlToQuery(sql`${relatedOrder.field}`).sql,
    ).toContain('"reorder_config_categories"."sort_order"');

    const groupLabel = reorderSort.group?.label;
    if (!groupLabel) {
      throw new Error("Expected a group label selection.");
    }
    expect(admin.list.select).toMatchObject({
      category: expect.anything(),
      categoryId: products.categoryId,
    });
    const labelSelection = admin.list.select?.[groupLabel];
    if (!labelSelection) {
      throw new Error("Expected a group label expression.");
    }
    const labelQuery = new PgDialect().sqlToQuery(sql`${labelSelection}`).sql;
    expect(labelQuery).toContain('"reorder_config_categories"."name"');
    expect(labelQuery).toContain("cast($1 as text)");
  });

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
        fields: serverFields(alphabeticalCategoryFields),
        table: alphabeticalCategories,
        list: {},
      },
    });
    const productModule = defineModule({
      name: "alphabetical-products",
      admin: {
        fields: serverFields(fields),
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

  it("inherits joins required by the related module's default order", () => {
    const joinedCategories = defineTable({
      name: "joined_reorder_config_categories",
      columns: {
        kind: text("kind").notNull().default("details"),
        name: text("name").notNull(),
      },
    });
    const categoryDetails = pgTable("joined_reorder_config_details", {
      id: integer()
        .primaryKey()
        .references(() => joinedCategories.id, { onDelete: "cascade" }),
      rank: text("rank").notNull(),
    });
    const joinedProducts = defineTable({
      name: "joined_reorder_config_products",
      reorder: true,
      columns: {
        categoryId: integer("category_id")
          .notNull()
          .references(() => joinedCategories.id),
        name: text("name").notNull(),
      },
    });
    const joinedCategoryFields = defineFields({
      fields: {
        kind: textField({
          default: "details",
          zod: z.enum(["details"]),
        }),
        name: textField(),
      },
      oneToOne: {
        details: {
          fields: {
            rank: textField({ sort: true }),
          },
        },
      },
    });
    const categoryModule = defineModule({
      name: "joined-categories",
      admin: {
        fields: serverFields(joinedCategoryFields),
        table: joinedCategories,
        oneToOne: {
          field: "kind",
          relations: {
            details: { table: categoryDetails },
          },
        },
        list: {
          sort: {
            rank: {
              fields: [categoryDetails.rank],
            },
          },
        },
      },
    });
    const productModule = defineModule({
      name: "joined-products",
      admin: {
        fields: serverFields(fields),
        table: joinedProducts,
        list: {
          reorder: {
            scope: joinedProducts.categoryId,
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
    const relatedOrder = reorderSort?.fields[0];
    if (!relatedOrder || !("field" in relatedOrder)) {
      throw new Error("Expected a related order expression.");
    }

    const orderQuery = new PgDialect().sqlToQuery(
      sql`${relatedOrder.field}`,
    ).sql;
    expect(orderQuery).toContain('left join "joined_reorder_config_details"');
    expect(orderQuery).toContain('"joined_reorder_config_details"."rank"');
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
          fields: serverFields(fields),
          table: products,
          list: {
            reorder: {
              scope: otherCategories.id,
            },
          },
        },
      }),
    ).toThrow(/other_reorder_config_categories\.id/);
  });

  it("rejects a nullable scope column", () => {
    expect(() =>
      defineModule({
        name: "nullable-reorder-scope-products",
        admin: {
          fields: serverFields(fields),
          table: products,
          list: {
            reorder: {
              scope: products.optionalCategoryId,
            },
          },
        },
      }),
    ).toThrow(/optionalCategoryId/);
  });

  it("rejects a non-number scope column", () => {
    expect(() =>
      defineModule({
        name: "non-number-reorder-scope-products",
        admin: {
          fields: serverFields(fields),
          table: products,
          list: {
            reorder: {
              scope: products.active,
            },
          },
        },
      }),
    ).toThrow(/active/);
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
          fields: serverFields(nameOnlyFields),
          table: products,
          list: {
            reorder: {
              scope: products.categoryId,
            },
          },
        },
      }),
    ).toThrow(/missing-reorder-scope-products\.categoryId/);
  });

  it("rejects custom save behavior on the scope field", () => {
    expect(() =>
      defineModule({
        name: "custom-save-reorder-scope-products",
        admin: {
          fields: serverFields(fields, {
            categoryId: {
              save: async ({ value }) => value,
            },
          }),
          table: products,
          list: {
            reorder: {
              scope: products.categoryId,
            },
          },
        },
      }),
    ).toThrow(/custom-save-reorder-scope-products\.categoryId/);
  });

  it("accepts child reorder without an explicit scope", () => {
    const categoryModule = defineModule({
      name: "categories",
      admin: {
        fields: serverFields(categoryFields),
        table: categories,
        list: {},
      },
    });
    const childModule = defineModule({
      name: "child-reorder-scope-products",
      parent: {
        module: "categories",
        foreignKey: "categoryId",
      },
      admin: {
        fields: serverFields(fields),
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
        fields: serverFields(categoryFields),
        table: categories,
        list: {},
      },
    });
    const childModule = defineModule({
      name: "child-reorder-scope-products",
      admin: {
        fields: serverFields(fields),
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
    ).toThrow(/child module "child-reorder-scope-products"/);
  });

  it("requires the foreign-key target to have one registered list module", () => {
    const moduleConfig = defineModule({
      name: "products-without-category-module",
      admin: {
        fields: serverFields(fields),
        table: products,
        list: {
          reorder: {
            scope: products.categoryId,
          },
        },
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow(
      /products-without-category-module\.categoryId.*has 0 registered list modules; register exactly one/,
    );
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
        fields: serverFields(fields),
        table: unreferencedProducts,
        list: {
          reorder: {
            scope: unreferencedProducts.categoryId,
          },
        },
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow(
      /unreferenced-products\.categoryId.*has 0 matching single-column foreign keys; define exactly one/,
    );
  });
});
