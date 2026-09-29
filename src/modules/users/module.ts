/*
 * Public entry point: defineUsersModule, how Kenstack and host sites define the users module. Host
 * users modules import it, as Kenstack's own users module does.
 */

import type { SelectedFields } from "drizzle-orm/pg-core";
import type { SelectResultFields } from "drizzle-orm/query-builders/select.types";
import { UsersRound } from "lucide-react";

import type { AdminConfig } from "@kenstack/admin/module";
import { defineModule } from "@kenstack/admin/server";
import type { AuthUsersTable, Role } from "@kenstack/auth/server/types";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";
import type { User } from "@kenstack/types";

type UsersOptions<TTable, TSelect extends SelectedFields, TPublic> = {
  // Columns or SQL subqueries added to the cached current-user query; Kenstack's own fields replace
  // any with the same name, and sessionId, provider, expiresAt and authorizedUntil are dropped. Their
  // data is cached with the user, so a write to data a subquery reads must clear
  // adminLoadCacheTag("users", userId).
  currentUser?: { select: (users: TTable) => TSelect };
  // Fields added to the browser's user info. It runs after the cache on each request, so it can
  // compare stored values with the current time; it cannot replace Kenstack's own fields. Declared
  // before currentUser, its user lacks the selected fields.
  publicUser?: (user: User<Role> & SelectResultFields<TSelect>) => TPublic;
  // Where a sign-in lands when the request carries no safe returnTo; its answer passes the same
  // check and falls back to "/". Declared before currentUser, its user lacks the selected fields.
  loginDestination?: (
    user: User<Role> & SelectResultFields<TSelect>,
  ) => string | Promise<string>;
  // The page hosting ResetPasswordForm, where the forgot-password email's link lands after sign-in.
  passwordPath?: `/${string}`;
};

export function defineUsersModule<
  const TTable extends AuthUsersTable,
  const TFields extends ServerDefinedFields,
  TSelect extends SelectedFields = Record<never, never>,
  TPublic extends Record<string, unknown> = Record<never, never>,
  // What the site passed: an option it gives is typed exactly, and one it leaves out is absent, for
  // Kenstack's defaults to fill.
  const TOptions extends UsersOptions<TTable, TSelect, TPublic> = Record<
    never,
    never
  >,
>({
  admin,
  ...options
}: TOptions & { admin: AdminConfig<TTable, TFields> } & UsersOptions<
    TTable,
    TSelect,
    TPublic
  >) {
  return {
    ...defineModule({
      name: "users",
      title: "Users",
      icon: UsersRound,
      admin,
    }),
    ...options,
  };
}
