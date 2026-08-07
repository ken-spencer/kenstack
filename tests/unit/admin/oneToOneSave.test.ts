import { describe, expect, it, vi } from "vitest";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule, defineOneToOne } from "@kenstack/admin/module";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { defineTable } from "@kenstack/admin/table";
import { textField } from "@kenstack/fields";

const fields = defineFields({
  fields: {
    title: textField(),
  },
});
const relationFields = defineFields({
  fields: {
    overview: textField(),
  },
});
const parents = defineTable({
  name: "one_to_one_save_parents",
  columns: {
    kind: text().notNull().default("movie"),
    title: text(),
  },
});
const movies = pgTable("one_to_one_save_movies", {
  id: integer()
    .primaryKey()
    .references(() => parents.id, { onDelete: "cascade" }),
  overview: text(),
});
const tvSeries = pgTable("one_to_one_save_tv_series", {
  id: integer()
    .primaryKey()
    .references(() => parents.id, { onDelete: "cascade" }),
  overview: text(),
});
const moduleConfig = defineModule({
  name: "oneToOneSaveParents",
  admin: {
    table: parents,
    fields,
    oneToOne: {
      movie: defineOneToOne({ fields: relationFields, table: movies }),
      tv_series: defineOneToOne({
        fields: relationFields,
        table: tvSeries,
        title: "TV Series",
      }),
    },
    list: {},
  },
});

describe("one-to-one save validation", () => {
  it("uses module relation titles for the generated admin filter", () => {
    const { kind } = moduleConfig.admin.fields;
    expect("options" in kind ? kind.options : undefined).toEqual([
      { label: "Movie", value: "movie" },
      { label: "TV Series", value: "tv_series" },
    ]);
  });

  it("rejects more than one submitted relation namespace", async () => {
    const result = await saveAdminRecord({
      changes: ["movie", "tv_series"],
      id: 1,
      module: moduleConfig,
      values: {
        kind: "movie",
        movie: { overview: "Movie" },
        tv_series: { overview: "Series" },
      },
    });

    expect(result).toMatchObject({
      status: "error",
      error: expect.any(String),
    });
  });

  it("rejects a namespace that does not match the discriminator", async () => {
    const result = await saveAdminRecord({
      changes: ["tv_series"],
      id: 1,
      module: moduleConfig,
      values: {
        kind: "movie",
        tv_series: { overview: "Series" },
      },
    });

    expect(result).toMatchObject({
      status: "error",
      error: {
        fieldErrors: {
          tv_series: expect.any(String),
        },
      },
    });
  });

  it("rejects a relation namespace that is not an object", async () => {
    const result = await saveAdminRecord({
      changes: ["movie"],
      id: 1,
      module: moduleConfig,
      values: {
        kind: "movie",
        movie: "invalid",
      },
    });

    expect(result).toMatchObject({
      status: "error",
      error: expect.any(String),
    });
  });

  it("rejects an unsupported discriminator before persistence", async () => {
    const result = await saveAdminRecord({
      changes: ["kind"],
      id: 1,
      module: moduleConfig,
      values: {
        kind: "unsupported",
      },
    });

    expect(result).toMatchObject({
      status: "error",
      error: {
        fieldErrors: {
          kind: expect.any(String),
        },
      },
    });
  });
});
