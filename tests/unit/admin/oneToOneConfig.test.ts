import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule, defineOneToOne } from "@kenstack/admin/module";
import { defineAdmin } from "@kenstack/admin/server";
import { defineTable } from "@kenstack/admin/table";
import { dateField, textField } from "@kenstack/fields";

const fields = defineFields({
  fields: {
    title: textField({ default: "", zod: z.string().min(1) }),
  },
});
const movieFields = defineFields({
  fields: {
    runtime: textField({
      default: "",
      filter: true,
      list: true,
      searchable: true,
      sort: true,
      zod: z.string().min(1),
    }),
  },
});

describe("one-to-one field configuration", () => {
  it("uses resolved server schemas for related field sets", () => {
    const events = defineTable({
      name: "one_to_one_server_schema_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_server_schema_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id, { onDelete: "cascade" }),
      premiereDate: text("premiere_date"),
    });
    const fields = defineFields({ fields: {} });
    const premiereFields = defineFields({
      fields: { premiereDate: dateField() },
    });
    const moduleConfig = defineModule({
      name: "oneToOneServerSchemaEvents",
      admin: {
        fields,
        table: events,
        oneToOne: {
          movie: defineOneToOne({ fields: premiereFields, table: details }),
        },
      },
    });

    expect(
      moduleConfig.admin.schema.parse({
        kind: "movie",
        movie: { premiereDate: "" },
      }),
    ).toMatchObject({ movie: { premiereDate: null } });
  });

  it("requires the parent identity foreign key to cascade deletion", () => {
    const events = defineTable({
      name: "one_to_one_non_cascade_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_non_cascade_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id),
      runtime: integer(),
    });
    const moduleConfig = defineModule({
      name: "oneToOneNonCascadeEvents",
      admin: {
        table: events,
        fields,
        oneToOne: {
          movie: defineOneToOne({ fields: movieFields, table: details }),
        },
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow();
  });

  it("rejects a detail whose identity does not reference the parent identity", () => {
    const movies = defineTable({
      name: "one_to_one_list_movies",
      columns: {
        runtime: integer(),
      },
    });
    const events = defineTable({
      name: "one_to_one_list_events",
      columns: {
        kind: text("kind").notNull().default("movie"),
        title: text(),
        movieId: integer("movie_id")
          .unique()
          .references(() => movies.id),
      },
    });
    const moduleConfig = defineModule({
      name: "oneToOneListEvents",
      admin: {
        table: events,
        fields,
        oneToOne: {
          movie: defineOneToOne({ fields: movieFields, table: movies }),
        },
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow();
  });

  it("rejects an independently administered detail table", () => {
    const events = defineTable({
      name: "one_to_one_owned_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_owned_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id, { onDelete: "cascade" }),
      runtime: integer(),
    });
    const parentModule = defineModule({
      name: "oneToOneOwnedEvents",
      admin: {
        table: events,
        fields,
        oneToOne: {
          movie: defineOneToOne({ fields: movieFields, table: details }),
        },
      },
    });
    const detailModule = {
      ...parentModule,
      name: "oneToOneOwnedDetails",
      admin: { ...parentModule.admin, table: details, oneToOne: undefined },
    } as unknown as typeof parentModule;

    expect(() => defineAdmin([detailModule])).not.toThrow();
    expect(() => defineAdmin([parentModule, detailModule])).toThrow();
  });
});
