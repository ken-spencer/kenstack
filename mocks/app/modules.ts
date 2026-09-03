/* Compile-time @app/modules binding for standalone Kenstack tooling. */

import type { DefinedAdmin } from "@kenstack/admin/module";
import type { AuthUsersTable } from "@kenstack/auth/server/types";

export const modules = {
  users: { admin: { table: {} as AuthUsersTable } },
} as unknown as DefinedAdmin & {
  users: DefinedAdmin[string] & {
    admin: NonNullable<DefinedAdmin[string]["admin"]> & {
      table: AuthUsersTable;
    };
  };
};
