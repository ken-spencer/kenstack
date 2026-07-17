import { defineTable } from "@kenstack/admin/table";
import { sql } from "drizzle-orm";
import { text, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { type ExtraTable } from "@kenstack/admin/table";

export const userColumns = {
  givenName: text("given_name").notNull(),
  middleName: text("middle_name").notNull().default(""),
  familyName: text("family_name").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  roles: text("roles")
    .array()
    .notNull()
    .default(sql`'{}'`),
  avatar: integer("avatar"),
  passwordHash: text("password_hash"),
};

export function userTableExtraConfig<
  TTable extends ExtraTable<typeof userColumns>,
>(t: TTable) {
  return [
    uniqueIndex("users_email_unique_active")
      .on(sql`lower(${t.email})`)
      .where(sql`${t.deletedAt} IS NULL AND ${t.email} <> ''`),
  ];
}

export const users = defineTable({
  name: "users",
  columns: userColumns,
  extraConfig: userTableExtraConfig,
});
export type Users = typeof users;
