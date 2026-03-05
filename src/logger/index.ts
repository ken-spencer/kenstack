import { createAuditLogger } from "./audit";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";

export const createLogger = <TSchema extends Record<string, unknown>>(
  db: PostgresJsDatabase<TSchema>
) => ({
  audit: createAuditLogger(db),
});
