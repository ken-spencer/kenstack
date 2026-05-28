import {
  integer,
  pgTable,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const fields = {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  slug: text("slug").notNull(), // per-page identifier (e.g. "home", "about")

  title: text("title"),
  description: text("description"),
  image: integer("image"),
  ogImage: integer("og_image"),
  content: text("content"),

  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),

  data: jsonb("data").$type<Record<string, unknown>>(), // custom fields.

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

export const content = pgTable(
  "content",
  {
    ...fields,
  },
  (t) => [uniqueIndex("content_slug_unique").on(t.slug)],
);
