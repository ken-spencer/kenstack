import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@app/deps", () => ({ deps: {}, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { defineTable } from "@kenstack/admin/table";
import { textField } from "@kenstack/fields/client";
import { serverFields } from "@kenstack/fields/server";

const fields = defineFields({
  fields: {
    kind: textField({
      default: "movie",
      zod: z.enum(["movie", "tvSeries"]),
    }),
    title: textField(),
  },
  oneToOne: {
    movie: {
      fields: {
        overview: textField(),
      },
    },
    tvSeries: {
      fields: {
        overview: textField(),
      },
    },
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
    fields: serverFields(fields),
    oneToOne: {
      field: "kind",
      relations: {
        movie: { table: movies },
        tvSeries: { table: tvSeries },
      },
    },
    list: {},
  },
});

describe("one-to-one save validation", () => {
  it("rejects more than one submitted relation namespace", async () => {
    const result = await saveAdminRecord({
      changes: ["movie", "tvSeries"],
      id: 1,
      module: moduleConfig,
      values: {
        kind: "movie",
        movie: { overview: "Movie" },
        tvSeries: { overview: "Series" },
      },
    });

    expect(result).toMatchObject({
      status: "error",
      error: expect.any(String),
    });
  });

  it("rejects a namespace that does not match the discriminator", async () => {
    const result = await saveAdminRecord({
      changes: ["tvSeries"],
      id: 1,
      module: moduleConfig,
      values: {
        kind: "movie",
        tvSeries: { overview: "Series" },
      },
    });

    expect(result).toMatchObject({
      status: "error",
      error: {
        fieldErrors: {
          tvSeries: expect.any(String),
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
