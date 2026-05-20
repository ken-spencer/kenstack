import { createDeps } from "@kenstack/deps";

import * as users from "@kenstack/modules/users/tables";
import * as coreTables from "@kenstack/db/tables";
import { createContent } from "@kenstack/db/tables/content";
const content = createContent();

const tables = { ...users, ...coreTables, content };

export const deps = createDeps({
  tables,
});
