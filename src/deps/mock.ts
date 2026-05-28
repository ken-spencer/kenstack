import { createDeps } from "@kenstack/deps";

import * as users from "@kenstack/modules/users/tables";
import * as coreTables from "@kenstack/db/tables";

const tables = { ...users, ...coreTables };

export const deps = createDeps({
  tables,
});
