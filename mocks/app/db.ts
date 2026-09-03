/* Compile-time @app/db binding for standalone Kenstack tooling. */

import type { createDb } from "@kenstack/db";

type Tables = typeof import("@kenstack/db/tables") &
  typeof import("@kenstack/db/tables/verification") &
  typeof import("@kenstack/modules/users/tables");

export const db = {} as ReturnType<typeof createDb<Tables>>;
