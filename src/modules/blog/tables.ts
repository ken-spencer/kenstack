import { defineTable, metaColumns } from "@kenstack/admin/table";
import { sql } from "drizzle-orm";
import { text, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import pluralize from "pluralize";

import { defineImageGallery, defineTags } from "@kenstack/db/tables";

export type BlogTablesOptions = {
  prefix?: string;
};

export function defineBlogTables(
  tableName = "blogs",
  { prefix = pluralize.singular(tableName) }: BlogTablesOptions = {},
) {
  const posts = defineTable({
    name: tableName,
    columns: {
      ...metaColumns,
      title: text("title").notNull().default(""),
      slug: text("slug").notNull().default(""),
      image: integer("image"),
      description: text().notNull().default(""),
      content: text().notNull().default(""),
    },
    extraConfig: (t) => [
      index(`${tableName}_published_at_idx`)
        .on(t.publishedAt)
        .where(sql`${t.deletedAt} IS NULL`),

      uniqueIndex(`${tableName}_slug_unique`)
        .on(t.slug)
        .where(sql`${t.deletedAt} IS NULL`),
    ],
  });

  return {
    tableName,
    prefix,
    posts,
    tags: defineTags({ table: posts, prefix }),
    images: defineImageGallery({ table: posts, prefix }),
  };
}

export const blogTables = defineBlogTables();
export const blogs = blogTables.posts;
export const blog_tags = blogTables.tags;
export const blog_images = blogTables.images;
