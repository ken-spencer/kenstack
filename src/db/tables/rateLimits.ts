import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    namespace: text().notNull(),
    subject: text().notNull(),
    keyHash: text("key_hash").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("rate_limit_events_scope_requested_idx").on(
      table.namespace,
      table.subject,
      table.keyHash,
      table.requestedAt,
    ),
    index("rate_limit_events_expires_idx").on(table.expiresAt),
  ],
);
