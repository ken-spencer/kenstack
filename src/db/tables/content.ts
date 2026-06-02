import { integer, text, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { defineTable } from "@kenstack/admin/table";

export const content = defineTable({
  name: "content",
  columns: {
    slug: text("slug").notNull(), // per-page identifier (e.g. "home", "about")

    title: text("title"),
    description: text("description"),
    image: integer("image"),
    ogImage: integer("og_image"),
    content: text("content"),

    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),

    data: jsonb("data").$type<Record<string, unknown>>(), // custom fields.
  },
  extraConfig: (t) => [uniqueIndex("content_slug_unique").on(t.slug)],
});
