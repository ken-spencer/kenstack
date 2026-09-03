import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per counted use. Either subject may be null when it was unknown.
export const quotaUses = pgTable(
  "quota_uses",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    scope: text().notNull(),
    email: text(),
    ip: text(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("quota_uses_email_created_idx").on(table.email, table.createdAt),
    index("quota_uses_ip_created_idx").on(table.ip, table.createdAt),
    index("quota_uses_created_at_idx").on(table.createdAt),
  ],
);
