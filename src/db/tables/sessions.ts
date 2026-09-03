import {
  integer,
  pgEnum,
  pgTable,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "@kenstack/modules/users/tables";
import { relations } from "drizzle-orm";

export const loginProvider = pgEnum("login_provider", [
  "password",
  "google",
  "apple",
  "facebook",
  "email",
]);

export type LoginProvider = (typeof loginProvider.enumValues)[number];

export const sessions = pgTable(
  "sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    tokenHash: varchar("token_hash", { length: 64 }).notNull(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    impersonatedBy: integer("impersonated_by").references(() => users.id, {
      onDelete: "cascade",
    }),

    provider: loginProvider("provider").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

    // Optional metadata (useful for “log out other devices” UI, audits, etc.)
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_id_idx").on(t.userId),
    index("sessions_expires_at_idx").on(t.expiresAt),
  ],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export type Sessions = typeof sessions;
