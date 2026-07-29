import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as z from "zod";

const mocks = vi.hoisted(() => {
  const audit = vi.fn(async () => {});
  return {
    audit,
    deps: {
      auth: {
        requireUser: vi.fn(async () => ({ id: 1 })),
      },
      db: undefined as unknown,
      logger: { audit },
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@app/deps", () => ({ deps: mocks.deps, tables: {} }));

import { defineFields } from "@kenstack/admin/fields";
import { defineModule } from "@kenstack/admin/module";
import { saveAdminRecord } from "@kenstack/admin/queries/save";
import { defineTable } from "@kenstack/admin/table";
import { revisions } from "@kenstack/db/tables/revisions";
import { textField } from "@kenstack/fields/client";
import { serverFields } from "@kenstack/fields/server";
import { isRecord } from "@kenstack/lib/isRecord";
import { startTestPostgres } from "../postgres";

const fields = defineFields({
  fields: {
    kind: textField({
      default: "movie",
      zod: z.enum(["movie"]),
    }),
    title: textField(),
  },
  oneToOne: {
    movie: {
      fields: {
        overview: textField(),
      },
    },
  },
});
const parents = defineTable({
  name: "integration_one_to_one_parents",
  columns: {
    kind: text().notNull().default("movie"),
    title: text(),
  },
});
const movies = pgTable("integration_one_to_one_movies", {
  id: integer()
    .primaryKey()
    .references(() => parents.id, { onDelete: "cascade" }),
  overview: text(),
});

let preparationBarrier: (() => Promise<void>) | undefined;
const moduleConfig = defineModule({
  name: "integrationOneToOneParents",
  admin: {
    table: parents,
    fields: serverFields(fields),
    oneToOne: {
      field: "kind",
      relations: {
        movie: {
          table: movies,
          behaviors: {
            overview: {
              async prepareSave({ value }) {
                await preparationBarrier?.();
                return { status: "success" as const, value };
              },
            },
          },
        },
      },
    },
    list: {},
  },
});
const schema = { movies, parents, revisions };

let cluster: Awaited<ReturnType<typeof startTestPostgres>>;
let database: PostgresJsDatabase<typeof schema>;
let sqlClient: ReturnType<typeof postgres>;

beforeAll(async () => {
  cluster = await startTestPostgres();
  sqlClient = postgres({
    ...cluster.connection,
    max: 4,
    prepare: false,
  });
  database = drizzle(sqlClient, { schema });
  mocks.deps.db = database;

  await sqlClient.unsafe(`
    create table integration_one_to_one_parents (
      id integer generated always as identity primary key,
      created_by integer,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      kind text not null default 'movie',
      title text
    )
  `);
  await sqlClient.unsafe(`
    create table integration_one_to_one_movies (
      id integer primary key
        references integration_one_to_one_parents(id) on delete cascade,
      overview text
    )
  `);
  await sqlClient.unsafe(`
    create table revisions (
      id integer generated always as identity primary key,
      "table" varchar(64) not null,
      row_id integer not null,
      created_at timestamptz not null default now(),
      created_by integer,
      changes text[] not null,
      snapshot jsonb not null
    )
  `);
});

beforeEach(async () => {
  preparationBarrier = undefined;
  mocks.audit.mockClear();
  await sqlClient.unsafe(`
    truncate integration_one_to_one_movies,
      integration_one_to_one_parents,
      revisions restart identity cascade
  `);
});

afterAll(async () => {
  try {
    await sqlClient?.end({ timeout: 5 });
  } finally {
    await cluster?.stop();
  }
});

describe("one-to-one PostgreSQL save boundary", () => {
  it("inserts the shared-primary-key detail and snapshots it in the parent revision", async () => {
    const [parent] = await database
      .insert(parents)
      .values({ kind: "movie", title: "Original" })
      .returning({ id: parents.id });

    const result = await saveAdminRecord({
      changes: ["movie"],
      id: parent.id,
      module: moduleConfig,
      values: {
        kind: "movie",
        title: "Original",
        movie: { overview: "First detail" },
      },
    });

    expect(result).toMatchObject({
      status: "success",
      values: {
        movie: { overview: "First detail" },
      },
    });
    await expect(
      database.select().from(movies).where(eq(movies.id, parent.id)),
    ).resolves.toEqual([
      {
        id: parent.id,
        overview: "First detail",
      },
    ]);
    const revisionRows = await database
      .select({
        changes: revisions.changes,
        snapshot: revisions.snapshot,
      })
      .from(revisions);
    expect(revisionRows).toEqual([
      {
        changes: ["movie.overview"],
        snapshot: {
          kind: "movie",
          movie: { overview: "First detail" },
          title: "Original",
        },
      },
    ]);
  });

  it("rolls back the parent and detail when revision persistence fails", async () => {
    const [parent] = await database
      .insert(parents)
      .values({ kind: "movie", title: "Original" })
      .returning({ id: parents.id });
    await sqlClient.unsafe(`
      create function reject_integration_revision() returns trigger
      language plpgsql as $$
      begin
        raise exception 'forced revision failure';
      end
      $$
    `);
    await sqlClient.unsafe(`
      create trigger reject_integration_revision
      before insert on revisions
      for each row execute function reject_integration_revision()
    `);

    try {
      await expect(
        saveAdminRecord({
          changes: ["title", "movie"],
          id: parent.id,
          module: moduleConfig,
          values: {
            kind: "movie",
            title: "Changed",
            movie: { overview: "Must roll back" },
          },
        }),
      ).rejects.toThrow();
    } finally {
      await sqlClient.unsafe(
        "drop trigger reject_integration_revision on revisions",
      );
      await sqlClient.unsafe("drop function reject_integration_revision()");
    }

    await expect(
      database
        .select({ title: parents.title })
        .from(parents)
        .where(eq(parents.id, parent.id)),
    ).resolves.toEqual([{ title: "Original" }]);
    await expect(
      database.select().from(movies).where(eq(movies.id, parent.id)),
    ).resolves.toEqual([]);
    await expect(database.select().from(revisions)).resolves.toEqual([]);
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("serializes concurrent first saves and rejects the stale request before insert", async () => {
    const [parent] = await database
      .insert(parents)
      .values({ kind: "movie", title: "Original" })
      .returning({ id: parents.id });
    let prepared = 0;
    let releasePreparations = () => {};
    const bothPrepared = new Promise<void>((resolve) => {
      releasePreparations = resolve;
    });
    preparationBarrier = async () => {
      prepared += 1;
      if (prepared === 2) {
        releasePreparations();
      }
      await bothPrepared;
    };

    const results = await Promise.all([
      saveAdminRecord({
        changes: ["movie"],
        id: parent.id,
        module: moduleConfig,
        values: {
          kind: "movie",
          title: "Original",
          movie: { overview: "First request" },
        },
      }),
      saveAdminRecord({
        changes: ["movie"],
        id: parent.id,
        module: moduleConfig,
        values: {
          kind: "movie",
          title: "Original",
          movie: { overview: "Second request" },
        },
      }),
    ]);
    const successes = results.filter((result) => result.status === "success");
    const failures = results.filter((result) => result.status === "error");

    expect(successes).toHaveLength(1);
    expect(failures).toEqual([
      {
        status: "error",
        error: {
          message:
            "This related record changed. Reload the page and try again.",
        },
      },
    ]);
    const [movie] = await database
      .select()
      .from(movies)
      .where(eq(movies.id, parent.id));
    const success = successes[0];
    if (success.status !== "success" || !isRecord(success.values.movie)) {
      throw new Error("Expected one successful related save.");
    }
    expect(movie.overview).toBe(success.values.movie.overview);
    await expect(database.select().from(revisions)).resolves.toHaveLength(1);
    expect(mocks.audit).toHaveBeenCalledOnce();
  });
});
