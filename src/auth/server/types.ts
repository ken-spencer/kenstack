import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type deps from "@app/deps";
import type { AdminTable } from "@kenstack/admin/table";

export type Role = keyof typeof deps.roles;

export type AuthUsersTable = AdminTable & {
  givenName: AnyPgColumn<{ data: string; notNull: true }>;
  middleName: AnyPgColumn<{ data: string; notNull: true }>;
  familyName: AnyPgColumn<{ data: string; notNull: true }>;
  email: AnyPgColumn<{ data: string; notNull: true }>;
  roles: AnyPgColumn<{ data: string[]; notNull: true }>;
  avatar: AnyPgColumn<{ data: number | null }>;
  passwordHash: AnyPgColumn<{ data: string | null }>;
};
