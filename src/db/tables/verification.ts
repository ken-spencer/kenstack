import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const verifications = pgTable(
  "verifications",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    challengeKey: uuid("challenge_key").notNull(),
    codeHash: text("code_hash").notNull(),
    codeSalt: text("code_salt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    email: text().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    isDecoy: boolean("is_decoy").notNull().default(false),
    verificationKeyHash: text("verification_key_hash").notNull(),
    provenAt: timestamp("proven_at", { withTimezone: true }),
    tokenHash: text("token_hash").notNull(),
  },
  (t) => [
    index("verifications_expiry_idx").on(t.expiresAt),
    index("verifications_verification_key_hash_created_idx").on(
      t.verificationKeyHash,
      t.createdAt,
    ),
    uniqueIndex("verifications_token_unique").on(t.tokenHash),
    check("verifications_failed_attempts_check", sql`${t.failedAttempts} >= 0`),
  ],
);
