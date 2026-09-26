import { integer } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const { cacheLife, cacheTag, nextPublication, requireUser } = vi.hoisted(
  () => ({
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
    nextPublication: { value: null as Date | null },
    requireUser: vi.fn(),
  }),
);

vi.mock("@app/db", async () => {
  return {
    db: (await import("drizzle-orm/pg-proxy")).drizzle(async (query) => {
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
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
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

describe("listQuery", () => {
  afterEach(() => {
    cacheLife.mockClear();
    cacheTag.mockClear();
    nextPublication.value = null;
    vi.useRealTimers();
  });

  it("expires no later than a sub-second publication boundary", async () => {
    const now = new Date("2026-08-27T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    nextPublication.value = new Date(now.getTime() + 500);

    await listQuery(articles, {
      cacheTags: ["articles"],
      draft: false,
      select: { id: articles.id },
    });

    expect(cacheLife).toHaveBeenLastCalledWith(
      expect.objectContaining({ expire: 0.5 }),
    );
  });

  it("tags the entry and keeps it for max when nothing is scheduled", async () => {
    await listQuery(articles, {
      cacheTags: ["articles", "articles:featured"],
      draft: false,
      select: { id: articles.id },
    });

    expect(cacheTag).toHaveBeenCalledWith("articles", "articles:featured");
    expect(cacheLife).toHaveBeenLastCalledWith("max");
  });

  it("applies a caller's shorter lifetime beside the publication one", async () => {
    nextPublication.value = new Date(Date.now() + 10 * 60 * 1000);

    await listQuery(articles, {
      cacheLife: "hours",
      cacheTags: ["articles"],
      draft: false,
      select: { id: articles.id },
    });

    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheLife).toHaveBeenCalledWith(
      expect.objectContaining({ expire: expect.closeTo(600, 0) }),
    );
  });

  it("reads rows alone without cache tags", async () => {
    await listQuery(articles, { draft: false, select: { id: articles.id } });

    expect(cacheTag).not.toHaveBeenCalled();
    expect(cacheLife).not.toHaveBeenCalled();
  });
});
