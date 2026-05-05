import { getTableColumns, type SQL } from "drizzle-orm";
import { type MetaTable } from "@kenstack/admin/table";
import { type DefinedFields } from "@kenstack/admin/fields";
import { type AnyPgColumn } from "drizzle-orm/pg-core";
import { selectImageSubquery } from "@kenstack/db/tables";

export function selectFields<
  TTable extends MetaTable,
  TSelection extends DefinedFields,
>(table: TTable, selection: TSelection) {
  const columns = getTableColumns(table);
  const baseResult = {
    id: table.id,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };

  const result = baseResult as typeof baseResult &
    Record<string, SQL | AnyPgColumn>;

  for (const key in selection) {
    const field = selection[key];
    if (key in columns) {
      const column = columns[key];

      if (field.kind === "image") {
        result[key] = selectImageSubquery(column, "square");
        continue;
      }

      result[key] = column;
    }
  }

  return result;
}
