import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { type MetaTable } from "@kenstack/admin/table";

export const tags = pgTable(
  "tags",
  {
    id: serial("id").primaryKey(),

    name: text("name").notNull(),
    slug: text("slug").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("tags_name_lower_unique").on(sql`lower(${t.name})`),
    uniqueIndex("tags_slug_unique").on(t.slug),
  ],
);

export const defineTags = ({
  table,
  prefix,
}: {
  table: MetaTable;
  prefix: string;
}) =>
  pgTable(
    prefix + "_tags",
    {
      tableId: integer(prefix + "_id")
        .notNull()
        .references(() => table.id, { onDelete: "cascade" }),

      tagId: integer("tag_id")
        .notNull()
        .references(() => tags.id, { onDelete: "cascade" }),

      createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    },
    (t) => [
      uniqueIndex(prefix + "_tags_" + prefix + "_id_tag_id_unique").on(
        t.tableId,
        t.tagId,
      ),

      index(prefix + "_tags_" + prefix + "_id_idx").on(t.tableId),
      index(prefix + "_tags_tag_id_idx").on(t.tagId),
    ],
  );

export type TagsTable = ReturnType<typeof defineTags>;
