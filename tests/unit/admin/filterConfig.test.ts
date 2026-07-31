import { describe, expect, it, vi } from "vitest";
import { text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import { textField } from "@kenstack/fields/client";

const products = defineTable({
  name: "filter_config_products",
  publish: true,
  columns: {
    name: text("name").notNull(),
  },
});

const fields = defineFields({
  publish: true,
  fields: {
    name: textField(),
  },
});

describe("admin filter configuration", () => {
  it("uses field visibility metadata before the generic fallback", () => {
    const visibilityOptions = [
      { label: "Unavailable", value: "draft" },
      { label: "Available", value: "published" },
      { label: "Unlisted", value: "unlisted" },
    ];
    const moduleConfig = defineModule({
      name: "filter-config-products",
      admin: {
        fields: {
          ...fields,
          visibility: {
            ...fields.visibility,
            label: "Availability",
            options: visibilityOptions,
          },
        },
        table: products,
        list: {},
      },
    });
    expect(moduleConfig.admin.list).toMatchObject({
      filters: {
        visibility: {
          label: "Availability",
          kind: "enum",
          field: products.visibility,
          options: visibilityOptions,
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
