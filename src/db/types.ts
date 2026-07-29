import type { tables } from "@app/deps";
import type { createDb } from "@kenstack/db";
import type {
  AnyPgColumn,
  AnyPgTable,
  PgColumn,
  PgTableWithColumns,
} from "drizzle-orm/pg-core";

type TableWithIdColumns = {
  id: PgColumn;
  [key: string]: PgColumn;
};

export type AnyPgTableWithId = PgTableWithColumns<{
  name: string;
  schema: string | undefined;
  columns: TableWithIdColumns;
  dialect: "pg";
}>;

export type Database = ReturnType<typeof createDb<typeof tables>>;

export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type NumericIdTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
};
