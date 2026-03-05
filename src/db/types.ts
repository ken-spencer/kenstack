import { type PgColumn, type PgTableWithColumns } from "drizzle-orm/pg-core";

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
