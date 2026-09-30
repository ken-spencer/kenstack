import "server-only";

import { db as appDb } from "@app/db";
import type { NumericIdTable } from "@kenstack/db/types";
import { selectFields } from "./select";
import type { FieldLoadContext } from "@kenstack/fields/server";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";
import { eq, type SQL } from "drizzle-orm";
import type { SelectedFields } from "drizzle-orm/pg-core/query-builders/select.types";

export async function loadRecord(options: {
  table: NumericIdTable;
  fields: ServerDefinedFields;
  defaults?: Record<string, unknown>;
  db?: FieldLoadContext["db"];
  id?: number | null;
  select?: SelectedFields;
  where?: SQL;
}) {
  const { table, fields, id } = options;
  const db = options.db ?? appDb;
  let row: ({ id: number } & Record<string, unknown>) | undefined;

  if (options.where || id != null) {
    [row] = await db
      .select({ ...selectFields(table, fields), ...options.select })
      .from(table)
      .where(id == null ? options.where : (options.where ?? eq(table.id, id)))
      .limit(1);
  }

  const values: Record<string, unknown> = row
    ? { ...row }
    : { ...options.defaults };

  if (row) {
    for (const [fieldKey, field] of Object.entries(fields)) {
      if (field.load) {
        values[fieldKey] = await field.load({
          db,
          key: fieldKey,
          tableId: row.id,
        });
      }
    }
  }

  return { row, values };
}
