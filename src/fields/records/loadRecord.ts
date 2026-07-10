import { deps } from "@app/deps";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import { selectFields } from "@kenstack/fields/select";
import type { ServerDefinedFields } from "@kenstack/fields/server";
import { eq, type SQL } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import type { SelectResultFields } from "drizzle-orm/query-builders/select.types";
import type { SelectedFields } from "drizzle-orm/pg-core/query-builders/select.types";

type LoadRecordTable = AdminTable | AdminKeyTable;
type EmptySelect = Record<never, never>;

type LoadedRow<TSelect extends SelectedFields = EmptySelect> = {
  id: number;
} & Record<string, unknown> &
  SelectResultFields<TSelect>;

type LoadRecordSelect<
  TTable extends LoadRecordTable,
  TSelect extends SelectedFields,
> = ReturnType<typeof selectFields<TTable, ServerDefinedFields>> & TSelect;

type LoadedValues<
  TSelect extends SelectedFields,
  TDefaults extends Record<string, unknown>,
> = TDefaults & Record<string, unknown> & Partial<SelectResultFields<TSelect>>;

type LoadRecordOptions<
  TTable extends LoadRecordTable,
  TSelect extends SelectedFields = EmptySelect,
  TDefaults extends Record<string, unknown> = Record<string, unknown>,
> = {
  table: TTable;
  fields: ServerDefinedFields;
  defaults?: TDefaults;
  id?: number | null;
  select?: TSelect;
  where?: SQL;
  query?: (ctx: {
    db: typeof deps.db;
    select: LoadRecordSelect<TTable, TSelect>;
  }) => Promise<LoadedRow<TSelect> | undefined>;
};

export async function loadRecord<
  TTable extends LoadRecordTable,
  const TSelect extends SelectedFields = EmptySelect,
  TDefaults extends Record<string, unknown> = Record<string, unknown>,
>(options: LoadRecordOptions<TTable, TSelect, TDefaults>) {
  const { table, fields, id } = options;
  const defaults = options.defaults ?? ({} as TDefaults);
  const select = {
    ...selectFields(table, fields),
    ...options.select,
  } as LoadRecordSelect<TTable, TSelect>;
  let row: LoadedRow<TSelect> | undefined;

  if (options.query) {
    row = await options.query({
      db: deps.db,
      select,
    });
  } else if (options.where || id != null) {
    [row] = (await deps.db
      .select(select)
      .from(table as AnyPgTable)
      .where(id == null ? options.where : (options.where ?? eq(table.id, id)))
      .limit(1)) as unknown as LoadedRow<TSelect>[];
  }

  const values: Record<string, unknown> = row ? { ...row } : { ...defaults };

  if (row) {
    for (const [fieldKey, field] of Object.entries(fields)) {
      if (field.load) {
        values[fieldKey] = await field.load({
          db: deps.db,
          key: fieldKey,
          tableId: row.id,
        });
      }
    }
  }

  return { row, values: values as LoadedValues<TSelect, TDefaults> };
}
