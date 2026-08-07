import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { integer, pgTable, PgDialect, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule, defineOneToOne } from "@kenstack/admin/module";
import {
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";
import { defineAdmin } from "@kenstack/admin/server";
import { defineTable } from "@kenstack/admin/table";
import { dateField, textField } from "@kenstack/fields";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import { resolveOneToOneList } from "@kenstack/admin/queries/listRelations";

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
const oneToOne = resolveOneToOneDefinition({ movie: movieFields });
const fieldTree = withOneToOneSelectionField(fields, oneToOne);

describe("one-to-one field configuration", () => {
  it("generates an optional namespace with a generated optional identity", () => {
    const schema = createSchemaFromFields(fieldTree, oneToOne);

    expect(schema.safeParse({ kind: "movie", title: "Event" }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ kind: "movie", title: "Event", movie: {} }).success,
    ).toBe(false);
    expect(
      schema.safeParse({
        kind: "movie",
        title: "Event",
        movie: { id: 42, runtime: "118" },
      }).success,
    ).toBe(true);
  });

  it("keeps related defaults out of shared defaults", () => {
    expect(createDefaultValues(fieldTree)).toEqual({
      kind: "movie",
      title: "",
    });
  });

  it("derives selection values, labels, and the default from relation keys", () => {
    const parentFields = defineFields({ fields: { title: textField() } });
    const selection = resolveOneToOneDefinition({
      movie: defineFields({ fields: {} }),
      tv_series: defineFields({ fields: {} }),
    });
    const fields = withOneToOneSelectionField(parentFields, selection);

    expect(fields.kind).toMatchObject({
      default: "movie",
      filter: true,
      kind: "one-to-one",
      label: "Type",
      list: true,
      options: [
        { label: "Movie", value: "movie" },
        { label: "Tv Series", value: "tv_series" },
      ],
    });
    expect(fields.kind.zod.safeParse("movie").success).toBe(true);
    expect(fields.kind.zod.safeParse("tv_series").success).toBe(true);
    expect(fields.kind.zod.safeParse("book").success).toBe(false);
  });

  it("rejects relation keys that collide with parent-owned fields", () => {
    expect(() =>
      withOneToOneSelectionField(
        fields,
        resolveOneToOneDefinition({ title: movieFields }),
      ),
    ).toThrow(/relation "title" conflicts with parent field/i);
    expect(() => resolveOneToOneDefinition({ kind: movieFields })).toThrow(
      /reserved selection field/i,
    );
  });

  it("resolves and validates the shared-primary-key default", () => {
    const events = defineTable({
      name: "one_to_one_default_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_default_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id, { onDelete: "cascade" }),
      runtime: integer(),
    });
    const moduleConfig = defineModule({
      name: "oneToOneDefaultEvents",
      admin: {
        table: events,
        fields,
        oneToOne: {
          movie: defineOneToOne({
            fields: movieFields,
            table: details,
            title: "Feature Film",
          }),
        },
        list: {},
      },
    });

    const admin = defineAdmin([moduleConfig]);
    const config = admin.oneToOneDefaultEvents.admin;
    expect(config.oneToOne?.relations.movie.foreignKey).toBe(details.id);
    if (!("sort" in config.list) || !("filters" in config.list)) {
      throw new Error("Expected resolved list configuration.");
    }
    expect(config.list.sort["movie.runtime"]).toMatchObject({
      defaultDirection: "asc",
      label: "Feature Film: Runtime",
    });
    expect(config.list.filters["movie.runtime"]).toMatchObject({
      kind: "text",
      label: "Feature Film: Runtime",
    });

    const relatedList = resolveOneToOneList(config);
    expect(Object.keys(relatedList.select)).toEqual(["movie.runtime"]);
    expect(relatedList.searchable).toEqual([details.runtime]);
    expect(relatedList.joins).toHaveLength(1);
    expect(relatedList.joins[0]).toMatchObject({
      table: details,
    });
    const joinQuery = new PgDialect().sqlToQuery(relatedList.joins[0].on);
    expect(joinQuery.sql).toContain(
      '"one_to_one_default_details"."id" = "one_to_one_default_events"."id"',
    );
    expect(joinQuery.sql).toContain('"one_to_one_default_events"."kind" = $1');
    expect(joinQuery.params).toEqual(["movie"]);
  });

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
        list: {},
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
        list: {},
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow(/on delete cascade/i);
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
        list: {},
      },
    });

    expect(() => defineAdmin([moduleConfig])).toThrow(
      /related "id" must reference the parent/i,
    );
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
        list: {},
      },
    });
    const detailModule = {
      ...parentModule,
      name: "oneToOneOwnedDetails",
      admin: { ...parentModule.admin, table: details },
    } as unknown as typeof parentModule;

    expect(() => defineAdmin([parentModule, detailModule])).toThrow(
      /parent-owned.*independently administered/i,
    );
  });
});
