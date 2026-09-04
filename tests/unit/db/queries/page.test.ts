import { eq } from "drizzle-orm";
import { text } from "drizzle-orm/pg-core";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";

const { draftMode, queries, requireUser } = vi.hoisted(() => ({
  draftMode: vi.fn(),
  queries: [] as string[],
  requireUser: vi.fn(),
}));

vi.mock("@app/db", async () => {
  return {
    db: (await import("drizzle-orm/pg-proxy")).drizzle(async (query) => {
      queries.push(query);
      return { rows: [] };
    }),
  };
});
vi.mock("@kenstack/auth/server/user", () => ({ requireUser }));
vi.mock("next/headers", () => ({ draftMode }));
vi.mock("server-only", () => ({}));

import { defineTable } from "@kenstack/admin/table";
import { pageQuery, resolveVisiblePage } from "@kenstack/db/queries/page";

const now = new Date("2026-08-26T12:00:00.000Z");

describe("resolveVisiblePage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    draftMode.mockReset();
    draftMode.mockResolvedValue({ isEnabled: false });
    requireUser.mockClear();
  });

  afterEach(() => {
    queries.length = 0;
    vi.useRealTimers();
  });

  it("owns active-row and configured page metadata selection", async () => {
    const articles = defineTable({
      name: "articles",
      publish: true,
      seo: true,
      columns: {
        slug: text("slug").notNull(),
        title: text("title").notNull(),
      },
    });

    const page = await pageQuery(articles, {
      select: { id: articles.id, title: articles.title },
      where: eq(articles.slug, "news"),
    });

    if (page) {
      expectTypeOf(page.seoTitle).toEqualTypeOf<string>();
      expectTypeOf(page.seoDescription).toEqualTypeOf<string>();
      expectTypeOf(page.ogImage).toEqualTypeOf<
        import("@kenstack/db/queries").SelectedImage | null
      >();
    }

    expect(queries).toHaveLength(1);
    expect(queries[0]).toContain('"articles"."deleted_at" is null');
    expect(queries[0]).toContain(
      'select "id", "title", "published_at", "visibility", "seo_title", "seo_description"',
    );
    expect(queries[0]).toContain('"og_image"');
    expect(queries[0]).toContain('"articles"."slug" = $');
    expect(queries[0]).toContain("limit $");
  });

  it("does not expose SEO fields for a table without that capability", async () => {
    const articles = defineTable({
      name: "plain_articles",
      publish: true,
      columns: { slug: text("slug").notNull() },
    });
    const page = await pageQuery(articles, {
      select: { id: articles.id },
      where: eq(articles.slug, "news"),
    });

    if (page) {
      expectTypeOf(page).not.toHaveProperty("seoTitle");
    }
  });

  it("includes unlisted pages that have no publication time", async () => {
    const page = { publishedAt: null, visibility: "unlisted" as const };

    await expect(resolveVisiblePage(page)).resolves.toBe(page);
  });

  it("withholds unlisted pages until their publication time", async () => {
    const page = {
      publishedAt: new Date(now.getTime() + 60_000),
      visibility: "unlisted" as const,
    };

    await expect(resolveVisiblePage(page)).resolves.toBeNull();
  });

  it("includes published pages at their publication time", async () => {
    const page = {
      publishedAt: new Date(now),
      visibility: "published" as const,
    };

    await expect(resolveVisiblePage(page)).resolves.toBe(page);
  });

  it("excludes scheduled published pages before publication", async () => {
    await expect(
      resolveVisiblePage({
        publishedAt: new Date("2026-08-26T12:00:00.001Z"),
        visibility: "published",
      }),
    ).resolves.toBeNull();
  });

  it("excludes published pages without a publication time", async () => {
    await expect(
      resolveVisiblePage({ publishedAt: null, visibility: "published" }),
    ).resolves.toBeNull();
  });

  it("excludes draft pages from public requests", async () => {
    await expect(
      resolveVisiblePage({ publishedAt: new Date(now), visibility: "draft" }),
    ).resolves.toBeNull();
  });

  it("requires an admin and returns a draft row in Draft Mode", async () => {
    const page = { publishedAt: null, visibility: "draft" as const };
    draftMode.mockResolvedValue({ isEnabled: true });

    await expect(resolveVisiblePage(page)).resolves.toBe(page);
    expect(requireUser).toHaveBeenCalledWith("admin");
  });

  it("still requires an admin when a Draft Mode row is missing", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });

    await expect(resolveVisiblePage(null)).resolves.toBeNull();
    expect(requireUser).toHaveBeenCalledWith("admin");
  });

  it("honors an explicit public-only override in Draft Mode", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });

    await expect(
      resolveVisiblePage(
        { publishedAt: new Date(now), visibility: "draft" },
        { draft: false },
      ),
    ).resolves.toBeNull();
    expect(draftMode).not.toHaveBeenCalled();
    expect(requireUser).not.toHaveBeenCalled();
  });
});
