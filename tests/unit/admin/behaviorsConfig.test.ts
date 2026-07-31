import { describe, expect, it, vi } from "vitest";
import { integer, text } from "drizzle-orm/pg-core";
import * as z from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineTable } from "@kenstack/admin/table";
import { field, textField } from "@kenstack/fields/client";
import { serverFields, type ServerBehaviors } from "@kenstack/fields/server";

const products = defineTable({
  name: "behavior_config_products",
  columns: {
    name: text("name").notNull(),
    stock: integer("stock").notNull(),
  },
});

const fields = defineFields({
  fields: {
    name: textField(),
    stock: field({
      default: 0,
      kind: "custom",
      zod: z.number().int(),
    }),
  },
});

describe("admin field behaviors", () => {
  it("applies configured behaviors to unwrapped field maps", () => {
    const moduleConfig = defineModule({
      name: "behavior-products",
      admin: {
        fields,
        behaviors: {
          stock: {
            preSave: async ({ value }) =>
              value < 0
                ? { status: "error", message: "Stock cannot be negative." }
                : { status: "success" },
          },
        },
        table: products,
        list: {},
      },
    });

    expect(moduleConfig.admin.fields.stock?.preSave).toBeTypeOf("function");
    expect(moduleConfig.admin.fields.name?.preSave).toBeUndefined();
    // Fields without configured behaviors still resolve their kind defaults.
    expect(moduleConfig.admin.fields.name?.filterConfig).toEqual({
      kind: "text",
    });
    // "behaviors" is config input only and is not retained on resolved modules.
    expect("behaviors" in moduleConfig.admin).toBe(false);
  });

  it("does not mutate an already-resolved field map shared between modules", () => {
    const shared = serverFields(fields);
    const moduleConfig = defineModule({
      name: "shared-behavior-products",
      admin: {
        fields: shared,
        behaviors: {
          stock: {
            preSave: async () => ({ status: "success" }),
          },
        },
        table: products,
        list: {},
      },
    });

    expect(moduleConfig.admin.fields.stock?.preSave).toBeTypeOf("function");
    expect(shared.stock.preSave).toBeUndefined();
  });

  it("rejects behaviors for fields the module does not declare", () => {
    expect(() =>
      defineModule({
        name: "unknown-behavior-products",
        admin: {
          fields,
          behaviors: { missing: {} } as ServerBehaviors<typeof fields>,
          table: products,
          list: {},
        },
      }),
    ).toThrow('Cannot configure unknown field "missing".');
  });
});
