import { expectTypeOf } from "vitest";
import { eq, sql } from "drizzle-orm";
import { text } from "drizzle-orm/pg-core";

import { defineTable } from "@kenstack/admin/table";
import { listQuery, type SelectedImage } from "@kenstack/db/queries";
import { pageQuery } from "@kenstack/db/queries/page";

// TypeScript compiles this block; Vitest does not treat these contracts as runtime tests.
if (false) {
  const titles = defineTable({
    name: "list_query_type_titles",
    publish: true,
    columns: { title: text("title").notNull() },
  });
  const listed = listQuery(titles, {
    draft: false,
    select: {
      id: titles.id,
      title: titles.title,
      tags: sql<string[]>`'{}'::text[]`,
    },
  });
  expectTypeOf<Awaited<typeof listed>>().toEqualTypeOf<
    { id: number; title: string; tags: string[] }[]
  >();
  void listed;

  // A page query adds SEO metadata only for tables that enable it.
  const seoArticles = defineTable({
    name: "page_query_type_seo_articles",
    publish: true,
    seo: true,
    columns: {
      slug: text("slug").notNull(),
      title: text("title").notNull(),
    },
  });
  const seoPage = pageQuery(seoArticles, {
    select: { id: seoArticles.id, title: seoArticles.title },
    where: eq(seoArticles.slug, "news"),
  });
  type SeoPage = NonNullable<Awaited<typeof seoPage>>;
  expectTypeOf<SeoPage["seoTitle"]>().toEqualTypeOf<string>();
  expectTypeOf<SeoPage["seoDescription"]>().toEqualTypeOf<string>();
  expectTypeOf<SeoPage["ogImage"]>().toEqualTypeOf<SelectedImage | null>();
  void seoPage;

  const plainArticles = defineTable({
    name: "page_query_type_plain_articles",
    publish: true,
    columns: { slug: text("slug").notNull() },
  });
  const plainPage = pageQuery(plainArticles, {
    select: { id: plainArticles.id },
    where: eq(plainArticles.slug, "news"),
  });
  expectTypeOf<NonNullable<Awaited<typeof plainPage>>>().not.toHaveProperty(
    "seoTitle",
  );
  void plainPage;
}
