import { describe, expect, it, vi } from "vitest";
import { boolean, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));

import { defineFields } from "@kenstack/admin/fields";
import { metaFieldOptions } from "@kenstack/admin/metaFields";
import { defineModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import { checkboxField, textField, toggleField } from "@kenstack/fields";

const products = defineTable({
  name: "filter_config_products",
  publish: true,
  columns: {
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    pos: boolean("pos").notNull(),
  },
});

const fields = defineFields({
  fields: {
    name: textField(),
  },
});

describe("admin filter configuration", () => {
  it("rejects a module field that the table's publish flag generates", () => {
    expect(() =>
      defineModule({
        name: "filter-config-products",
        admin: {
          fields: defineFields({
            fields: {
              name: textField(),
              visibility: metaFieldOptions.visibility,
            },
          }),
          table: products,
          list: {},
        },
      }),
    ).toThrow(/generated from the table's publish flag/);
  });

  it("derives checked field filter choices from the two declared values", () => {
    const moduleConfig = defineModule({
      name: "checked-filter-config-products",
      admin: {
        fields: defineFields({
          fields: {
            name: textField(),
            kind: toggleField({
              checked: "combo",
              unchecked: "item",
              filter: true,
            }),
          },
        }),
        table: products,
        list: {},
      },
    });

    expect(moduleConfig.admin.list).toMatchObject({
      filters: {
        kind: {
          kind: "enum",
          field: products.kind,
          options: [
            { label: "Item", value: "item" },
            { label: "Combo", value: "combo" },
          ],
        },
      },
    });
  });

  it("filters boolean checked pairs as boolean filters", () => {
    const moduleConfig = defineModule({
      name: "boolean-filter-config-products",
      admin: {
        fields: defineFields({
          fields: {
            name: textField(),
            pos: checkboxField({
              checked: true,
              unchecked: false,
              filter: true,
            }),
          },
        }),
        table: products,
        list: {},
      },
    });

    expect(moduleConfig.admin.list).toMatchObject({
      filters: {
        pos: {
          kind: "boolean",
          field: products.pos,
        },
      },
    });
  });

  it("retains the standard visibility filter by default", () => {
    const moduleConfig = defineModule({
      name: "default-filter-config-products",
      admin: {
        fields,
        table: products,
        list: {},
      },
    });
    expect(moduleConfig.admin.list).toMatchObject({
      filters: {
        visibility: {
          label: "Status",
          kind: "enum",
          field: products.visibility,
          options: [
            { label: "Draft", value: "draft" },
            { label: "Published", value: "published" },
            { label: "Unlisted", value: "unlisted" },
          ],
        },
      },
    });
  });
});
