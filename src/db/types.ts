import type { db } from "@app/db";
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

export type Database = typeof db;

export type DbTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

export type NumericIdTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
};
