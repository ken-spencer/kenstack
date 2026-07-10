import { createDeps } from "@kenstack/deps";
import { defineAdmin } from "@kenstack/admin/server";
import usersModule from "@kenstack/modules/users";

import * as users from "@kenstack/modules/users/tables";
import * as coreTables from "@kenstack/db/tables";

export const tables = { ...users, ...coreTables };

export const deps = createDeps({
  modules: defineAdmin([usersModule]),
  tables,
});
