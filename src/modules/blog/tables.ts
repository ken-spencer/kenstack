import { defineTable, metaColumns } from "@kenstack/admin/table";
import { sql } from "drizzle-orm";
import { text, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

import { defineImageGallery, defineTags } from "@kenstack/db/tables";

export const blogs = defineTable({
  name: "blogs",
  columns: {
    ...metaColumns,
    title: text("title").notNull().default(""),
    slug: text("slug").notNull().default(""),
    image: integer("image"),
    description: text().notNull().default(""),
    content: text().notNull().default(""),
  },
  extraConfig: (t) => [
    index("blogs_published_at_idx")
      .on(t.publishedAt)
      .where(sql`${t.deletedAt} IS NULL`),

    uniqueIndex("blogs_slug_unique")
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
});

export const blogTags = defineTags({ table: blogs, prefix: "blog" });

export const blogImages = defineImageGallery({ table: blogs, prefix: "blog" });
