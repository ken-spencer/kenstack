import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

declare global {
  var __sql: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_POOL_URL;
if (!connectionString) {
  throw new Error("DATABASE_POOL_URL is not set");
}

const makeClient = () =>
  postgres(connectionString, {
    prepare: false,
    debug: false,
    max: 1,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
  });

// Avoid creating a new client on every hot reload in dev.
const globalForDb = globalThis;
const sql = globalForDb.__sql ?? (globalForDb.__sql = makeClient());

export const createDb = <TSchema extends Record<string, unknown>>({
  schema,
}: {
  schema: TSchema;
}) => drizzle(sql, { schema });
