import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type Logger } from "@kenstack/logger/types";
import type { AdminTable } from "@kenstack/admin/table";
import { type Sessions } from "@kenstack/db/tables/sessions";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export type AuthUsersTable = AdminTable & {
  givenName: AnyPgColumn<{ data: string; notNull: true }>;
  middleName: AnyPgColumn<{ data: string; notNull: true }>;
  familyName: AnyPgColumn<{ data: string; notNull: true }>;
  email: AnyPgColumn<{ data: string; notNull: true }>;
  roles: AnyPgColumn<{ data: string[]; notNull: true }>;
  avatar: AnyPgColumn<{ data: number | null }>;
  passwordHash: AnyPgColumn<{ data: string | null }>;
};

export type AuthTables = { users: AuthUsersTable; sessions: Sessions };

export type AuthDeps<
  TSchema extends Record<string, unknown>,
  TRoles extends readonly string[],
> = {
  db: PostgresJsDatabase<TSchema>;
  tables: AuthTables;
  logger: Logger;
  roles: TRoles;
};
