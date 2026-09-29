/* Compile-time @app/modules binding for standalone Kenstack tooling. */

import { adminNavigation, type DefinedAdmin } from "@kenstack/admin/module";
import type { AuthUsersTable } from "@kenstack/auth/server/types";
import type siteSettingsModule from "@kenstack/modules/siteSettings";

export const modules = {
  users: { admin: { table: {} as AuthUsersTable } },
  [adminNavigation]: [],
} as unknown as DefinedAdmin & {
  "site-settings": typeof siteSettingsModule;
  users: DefinedAdmin[string] & {
    admin: NonNullable<DefinedAdmin[string]["admin"]> & {
      table: AuthUsersTable;
    };
  };
};
