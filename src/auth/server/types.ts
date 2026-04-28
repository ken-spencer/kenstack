import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type Logger } from "@kenstack/logger/types";
import { type Users } from "@kenstack/modules/users/tables";
import { type Sessions } from "@kenstack/db/tables/sessions";

export type Tables = { users: Users; sessions: Sessions };

export type AuthDeps<
  TSchema extends Tables,
  TRoles extends readonly string[],
> = {
  db: PostgresJsDatabase<TSchema>;
  tables: TSchema;
  logger: Logger;
  roles: TRoles;
};
