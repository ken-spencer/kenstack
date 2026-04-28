import { defineTable } from "@kenstack/admin/table";
import { sql } from "drizzle-orm";
import { text, varchar, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

import * as z from "zod";
import { image } from "@kenstack/schemas/atoms";
type Image = z.infer<ReturnType<typeof image>>;

export const users = defineTable({
  name: "users",
  columns: {
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`'{}'`),

    avatar: jsonb("avatar").$type<Image>(),
    passwordHash: text("password_hash"),
  },
  extraConfig: (t) => [
    uniqueIndex("users_email_unique_active")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.deletedAt} IS NULL`),
    index("users_org_deleted_at_idx")
      .on(t.deletedAt)
      .where(sql`${t.deletedAt} IS NOT NULL`),
  ],
});

export type Users = typeof users;
