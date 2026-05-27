import { deps } from "@app/deps";
import { selectFields } from "@kenstack/fields/select";
import type { ServerDefinedFields } from "@kenstack/fields/server";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

type LoadRecordTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
};

type LoadedRow = {
  id: number;
} & Record<string, unknown>;

type LoadRecordOptions<TTable extends LoadRecordTable> = {
  table: TTable;
  fields: ServerDefinedFields;
  defaults?: Record<string, unknown>;
  query: (ctx: {
    db: typeof deps.db;
    select: ReturnType<typeof selectFields<TTable, ServerDefinedFields>>;
  }) => Promise<LoadedRow | undefined>;
};

export async function loadRecord<TTable extends LoadRecordTable>({
  table,
  fields,
  defaults = {},
  query,
}: LoadRecordOptions<TTable>) {
  const row = await query({
    db: deps.db,
    select: selectFields(table, fields),
  });
  const values = {
    ...defaults,
    ...(row ?? {}),
  };

  if (!row) {
    return { row, values };
  }

  for (const [fieldKey, field] of Object.entries(fields)) {
    if (field.behavior?.load) {
      values[fieldKey] = await field.behavior.load({
        db: deps.db,
        key: fieldKey,
        tableId: row.id,
      });
    }
  }

  return { row, values };
}
