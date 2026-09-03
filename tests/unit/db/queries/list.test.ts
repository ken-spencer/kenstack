import { eq } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const { nextPublication, queries, requireUser } = vi.hoisted(() => ({
  nextPublication: { value: null as Date | null },
  queries: [] as string[],
  requireUser: vi.fn(),
}));

vi.mock("@app/db", async () => {
  return {
    db: (await import("drizzle-orm/pg-proxy")).drizzle(async (query) => {
      queries.push(query);
      return {
        rows:
          nextPublication.value && query.includes('"published_at" >')
            ? [[nextPublication.value]]
            : [],
      };
    }),
  };
});
vi.mock("@kenstack/auth/server/user", () => ({ requireUser }));
vi.mock("next/headers", () => ({ draftMode: vi.fn() }));
vi.mock("server-only", () => ({}));

import { defineTable } from "@kenstack/admin/table";
import { listQuery } from "@kenstack/db/queries/list";

const articles = defineTable({
  name: "articles",
  publish: true,
  columns: {
    categoryId: integer("category_id").notNull(),
  },
});
const categories = pgTable("categories", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
});

describe("listQuery", () => {
  afterEach(() => {
    nextPublication.value = null;
    queries.length = 0;
    vi.useRealTimers();
  });

  it("applies joins to row and publication-expiry queries", async () => {
    await listQuery(articles, {
      draft: false,
      joins: (query) => {
        query.innerJoin(categories, eq(categories.id, articles.categoryId));
      },
      select: { id: articles.id },
      where: eq(categories.slug, "news"),
    });

    expect(queries).toHaveLength(2);
    for (const query of queries) {
      expect(query).toContain(
        'inner join "categories" on "categories"."id" = "articles"."category_id"',
      );
      expect(query).toContain('"categories"."slug" = $');
    }
  });

  it("expires no later than a sub-second publication boundary", async () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    nextPublication.value = new Date(now.getTime() + 500);

    expect(
      (
        await listQuery(articles, {
          draft: false,
          select: { id: articles.id },
        })
      )[1],
    ).toEqual({ stale: 30, revalidate: 0, expire: 0.5 });
  });
});
