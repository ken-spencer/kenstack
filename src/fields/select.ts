import "server-only";

import { getTableColumns, type SQL } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

import type { SelectedMedia } from "@kenstack/db/tables";
import type { ServerDefinedFields, ServerField } from "./server";

type SelectFieldsTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
};

type SelectFieldsResult<
  TTable extends SelectFieldsTable,
  TSelection extends ServerDefinedFields,
> = {
  id: TTable["id"];
  createdAt: TTable["createdAt"];
  updatedAt: TTable["updatedAt"];
} & SelectDeletedAt<TTable> & {
    [TKey in Extract<keyof TSelection, keyof TTable>]: SelectFieldValue<
      TSelection[TKey],
      TTable[TKey]
    >;
  };

type SelectDeletedAt<TTable extends SelectFieldsTable> = TTable extends {
  deletedAt: AnyPgColumn;
}
  ? { deletedAt: TTable["deletedAt"] }
  : Record<never, never>;

type SelectFieldValue<
  TField extends ServerField,
  TColumn,
> = TField["kind"] extends "image" ? SQL<SelectedMedia | null> : TColumn;

/**
 * Used by record-loading actions to build a select query from field behavior.
 */
export function selectFields<
  TTable extends SelectFieldsTable,
  TSelection extends ServerDefinedFields,
>(table: TTable, selection: TSelection) {
  const columns = getTableColumns(table);
  const baseResult = {
    id: table.id,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
    ...("deletedAt" in table ? { deletedAt: table.deletedAt } : {}),
  } as SelectFieldsResult<TTable, TSelection>;

  for (const key in selection) {
    const field = selection[key];
    if (key in columns) {
      const column = columns[key];
      Object.assign(baseResult, {
        [key]:
          field.behavior?.select?.({ key, field, column, columns }) ?? column,
      });
    }
  }

  return baseResult;
}
