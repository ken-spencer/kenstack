import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { type Logger } from "@kenstack/logger/types";
import { type Users } from "@kenstack/db/schema/users";
import { type Sessions } from "@kenstack/db/schema/sessions";

export type Tables = { users: Users; sessions: Sessions };

export type AuthDeps<TSchema extends Tables> = {
  db: PostgresJsDatabase<TSchema>;
  tables: TSchema;
  logger: Logger;
  roles: readonly string[];
};
