import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const revisions = pgTable(
  "revisions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    table: varchar("table", { length: 64 }).notNull(),
    rowId: integer("row_id").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: integer("created_by"),

    changes: text("changes").array().notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  },
  (t) => [
    index("revisions_table_row_created_at_idx").on(
      t.table,
      t.rowId,
      t.createdAt,
    ),
  ],
);
