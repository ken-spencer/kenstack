import {
  integer,
  pgEnum,
  pgTable,
  varchar,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { relations, sql } from "drizzle-orm";

export const loginProvider = pgEnum("login_provider", [
  "password",
  "google",
  "apple",
  "facebook",
]);

export const sessions = pgTable(
  "sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    tokenHash: varchar("token_hash", { length: 64 }).notNull(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

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
  ]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const loginFailures = pgTable(
  "login_failures",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: varchar("email", { length: 320 }).notNull(),

    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    ip: text("ip").notNull(),
    userAgent: text("user_agent"),
    geo: jsonb("geo"),
  },
  (t) => [
    index("login_failures_email_attempted_at_idx").on(t.email, t.attemptedAt),
    index("login_failures_ip_attempted_at_idx").on(t.ip, t.attemptedAt),
    index("login_failures_attempted_at_idx").on(t.attemptedAt),
  ]
);

export const passwordResetRequests = pgTable(
  "password_reset_requests",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    email: varchar("email", { length: 320 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }),

    requestedAt: timestamp("requested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    ip: text("ip").notNull(),
    userAgent: text("user_agent"),
    geo: jsonb("geo"),
  },
  (t) => [
    uniqueIndex("password_reset_requests_token_hash_unique")
      .on(t.tokenHash)
      .where(sql`${t.tokenHash} IS NOT NULL`),
    index("password_reset_requests_email_requested_at_idx").on(
      t.email,
      t.requestedAt
    ),
    index("password_reset_requests_ip_requested_at_idx").on(
      t.ip,
      t.requestedAt
    ),
    index("password_reset_requests_requested_at_idx").on(t.requestedAt),
    index("password_reset_requests_expires_at_idx").on(t.expiresAt),
  ]
);

// export type PasswordResetRequest = typeof passwordResetRequests.$inferSelect;
export type Sessions = typeof sessions;
