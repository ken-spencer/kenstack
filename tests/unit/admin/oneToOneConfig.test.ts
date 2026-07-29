import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { integer, pgTable, PgDialect, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { defineAdmin } from "@kenstack/admin/server";
import { defineTable } from "@kenstack/admin/table";
import { textField } from "@kenstack/fields/client";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { createZodSchema } from "@kenstack/fields/createZodSchema";
import { serverFields } from "@kenstack/fields/server";
import { resolveOneToOneList } from "@kenstack/admin/queries/listRelations";

const fieldTree = defineFields({
  fields: {
    kind: textField({ default: "movie", zod: z.enum(["movie"]) }),
    title: textField({ default: "", zod: z.string().min(1) }),
  },
  oneToOne: {
    movie: {
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
    },
  },
});

describe("one-to-one field configuration", () => {
  it("generates an optional namespace with a generated optional identity", () => {
    const schema = createZodSchema(fieldTree);

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

  it("rejects a relation value normalized by the selection schema", () => {
    const fields = defineFields({
      fields: {
        kind: textField({ default: "movie", zod: z.string().trim() }),
      },
      oneToOne: {
        movie: {
          fields: {
            runtime: textField({ default: "", zod: z.string() }),
          },
        },
      },
    });
    const events = defineTable({
      name: "one_to_one_normalized_value_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_normalized_value_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id, { onDelete: "cascade" }),
      runtime: integer(),
    });

    expect(() =>
      defineModule({
        name: "oneToOneNormalizedValueEvents",
        admin: {
          table: events,
          fields: serverFields(fields),
          oneToOne: {
            field: "kind",
            relations: {
              movie: { table: details, value: " movie " },
            },
          },
          list: {},
        },
      }),
    ).toThrow(/value " movie " must remain the same string/i);
  });

  it("rejects a relation value changed to another type by the selection schema", () => {
    const fields = defineFields({
      fields: {
        kind: textField({
          default: "movie",
          zod: z.string().transform((value) => value.length),
        }),
      },
      oneToOne: {
        movie: {
          fields: {
            runtime: textField({ default: "", zod: z.string() }),
          },
        },
      },
    });
    const events = defineTable({
      name: "one_to_one_changed_type_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_changed_type_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id, { onDelete: "cascade" }),
      runtime: integer(),
    });

    expect(() =>
      defineModule({
        name: "oneToOneChangedTypeEvents",
        admin: {
          table: events,
          fields: serverFields(fields),
          oneToOne: {
            field: "kind",
            relations: {
              movie: { table: details },
            },
          },
          list: {},
        },
      }),
    ).toThrow(/value "movie" must remain the same string/i);
  });

  it("rejects a selection default normalized by its schema", () => {
    const fields = defineFields({
      fields: {
        kind: textField({ default: " movie ", zod: z.string().trim() }),
      },
      oneToOne: {
        movie: {
          fields: {
            runtime: textField({ default: "", zod: z.string() }),
          },
        },
      },
    });
    const events = defineTable({
      name: "one_to_one_normalized_default_events",
      columns: { kind: text("kind").notNull().default("movie") },
    });
    const details = pgTable("one_to_one_normalized_default_details", {
      id: integer()
        .primaryKey()
        .references(() => events.id, { onDelete: "cascade" }),
      runtime: integer(),
    });

    expect(() =>
      defineModule({
        name: "oneToOneNormalizedDefaultEvents",
        admin: {
          table: events,
          fields: serverFields(fields),
          oneToOne: {
            field: "kind",
            relations: {
              movie: { table: details },
            },
          },
          list: {},
        },
      }),
    ).toThrow(/default must remain the same string/i);
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
        fields: serverFields(fieldTree),
        oneToOne: {
          field: "kind",
          relations: { movie: { table: details } },
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
      label: "Movie: Runtime",
    });
    expect(config.list.filters["movie.runtime"]).toMatchObject({
      kind: "text",
      label: "Movie: Runtime",
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
        fields: serverFields(fieldTree),
        oneToOne: {
          field: "kind",
          relations: { movie: { table: details } },
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
        fields: serverFields(fieldTree),
        oneToOne: {
          field: "kind",
          relations: {
            movie: { table: movies },
          },
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
        fields: serverFields(fieldTree),
        oneToOne: {
          field: "kind",
          relations: { movie: { table: details } },
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
