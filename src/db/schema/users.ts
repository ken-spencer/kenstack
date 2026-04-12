import {
  integer,
  pgTable,
  text,
  jsonb,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { image } from "@kenstack/schemas/atoms";
import * as z from "zod";

type Avatar = z.infer<ReturnType<typeof image>>;

export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    publicId: text("public_id")
      .$defaultFn(() => createId())
      .notNull()
      .unique(),

    // orgId: integer("org_id")
    //   .notNull()
    //   .references(() => organizations.id),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),

    // name: text("name").generatedAlwaysAs(
    //   sql`trim(${sql.identifier("first_name")} || ' ' || ${sql.identifier("last_name")})`
    // ),

    email: varchar("email", { length: 320 }).notNull(),

    avatar: jsonb("avatar").$type<Avatar>(),

    passwordHash: text("password_hash"),
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`'{}'`),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // index("users_org_id_active_idx")
    //   .on(t.orgId)
    //   .where(sql`${t.deletedAt} IS NULL`),

    uniqueIndex("users_email_unique_active")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.deletedAt} IS NULL`),
    index("users_org_deleted_at_idx")
      .on(t.deletedAt)
      .where(sql`${t.deletedAt} IS NOT NULL`),
    index("users_org_created_at_active_idx")
      .on(t.createdAt)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

export type Users = typeof users;
