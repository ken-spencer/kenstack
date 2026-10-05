import { sql } from "drizzle-orm";

// A record's next `updated_at`, which is also its concurrency token. It is at least a millisecond
// past the row version the write replaces (Postgres recomputes SET when a concurrent update changed
// the row), so the token strictly advances, even for two writes in the same millisecond or a
// transaction that began earlier; `now()` is the transaction's start and is not used. The column is
// qualified by its table so an upsert's DO UPDATE reads the existing row.
export function nextUpdatedAt(tableName: string) {
  return sql`greatest(date_trunc('milliseconds', clock_timestamp()), date_trunc('milliseconds', ${sql.identifier(tableName)}."updated_at") + interval '1 millisecond')`;
}
