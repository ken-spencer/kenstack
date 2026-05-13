import { defineTable } from "@kenstack/admin/table";
import { sql } from "drizzle-orm";
import {
  text,
  varchar,
  integer,
  index,
  uniqueIndex,
  type PgColumnBuilderBase,
} from "drizzle-orm/pg-core";
import { type ExtraTable, type BuildTableOptions } from "@kenstack/admin/table";

const userColumns = {
  givenName: text("given_name").notNull(),
  familyName: text("family_name").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  roles: text("roles")
    .array()
    .notNull()
    .default(sql`'{}'`),
  avatar: integer("avatar"),
  passwordHash: text("password_hash"),
};

export const defineUsersTable = <
  const TColumnsMap extends Record<string, PgColumnBuilderBase> = {},
>({
  columns,
  extraConfig,
}: {
  columns?: TColumnsMap;
  extraConfig?: BuildTableOptions<
    "users",
    typeof userColumns & TColumnsMap
  >["extraConfig"];
} = {}) => {
  const allColumns = {
    ...userColumns,
    ...columns,
  };

  return defineTable({
    name: "users",
    columns: allColumns,
    extraConfig: (t) => [
      uniqueIndex("users_email_unique_active")
        .on(sql`lower(${t.email})`)
        .where(sql`${t.deletedAt} IS NULL`),
      index("users_org_deleted_at_idx")
        .on(t.deletedAt)
        .where(sql`${t.deletedAt} IS NOT NULL`),
      ...(extraConfig?.(t as ExtraTable<typeof userColumns & TColumnsMap>) ??
        []),
    ],
  });
};

export const users = defineUsersTable();
export type Users = typeof users;

// export const users = defineTable({
//   name: "users",
//   columns: {
//     givenName: text("given_name").notNull(),
//     familyName: text("family_name").notNull(),
//     email: varchar("email", { length: 320 }).notNull(),
//     roles: text("roles")
//       .array()
//       .notNull()
//       .default(sql`'{}'`),

//     // avatar: jsonb("avatar").$type<Image>(),
//     avatar: integer("avatar"),
//     passwordHash: text("password_hash"),
//   },
//   extraConfig: (t) => [
//     uniqueIndex("users_email_unique_active")
//       .on(sql`lower(${t.email})`)
//       .where(sql`${t.deletedAt} IS NULL`),
//     index("users_org_deleted_at_idx")
//       .on(t.deletedAt)
//       .where(sql`${t.deletedAt} IS NOT NULL`),
//   ],
// });

// export type Users = typeof users;
