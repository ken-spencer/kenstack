import { getTableColumns } from "drizzle-orm";

import type { DefinedFields } from "@kenstack/admin/fields";
import type { AdminKeyTable, AdminTable } from "@kenstack/admin/table";
import { selectImageSubquery } from "@kenstack/db/tables";

/**
 *   Used in admin api actions to build a select wuetry based on given fields
 */
export function selectFields<
  TTable extends AdminTable | AdminKeyTable,
  TSelection extends DefinedFields,
>(table: TTable, selection: TSelection) {
  const columns = getTableColumns(table);
  const baseResult = {
    id: table.id,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };

  for (const key in selection) {
    const field = selection[key];
    if (key in columns) {
      const column = columns[key];

      if (field.kind === "image") {
        Object.assign(baseResult, {
          [key]: selectImageSubquery(column, "square"),
        });
        continue;
      }

      Object.assign(baseResult, { [key]: column });
    }
  }

  return baseResult;
}
