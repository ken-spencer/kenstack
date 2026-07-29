import "server-only";

import { getTableColumns, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { SelectedMedia } from "@kenstack/db/tables";
import type { NumericIdTable } from "@kenstack/db/types";
import type { ServerDefinedFields } from "./server";

type SelectFieldsResult<
  TTable extends NumericIdTable,
  TSelection extends ServerDefinedFields,
> = {
  id: TTable["id"];
} & SelectMetaFields<TTable> & {
    [TKey in Extract<keyof TSelection, keyof TTable>]: SelectFieldValue<
      TSelection[TKey],
      TTable[TKey]
    >;
  };

type SelectMetaFields<TTable extends NumericIdTable> = (TTable extends {
  createdAt: AnyPgColumn;
}
  ? { createdAt: TTable["createdAt"] }
  : Record<never, never>) &
  (TTable extends { updatedAt: AnyPgColumn }
    ? { updatedAt: TTable["updatedAt"] }
    : Record<never, never>) &
  (TTable extends { deletedAt: AnyPgColumn }
    ? { deletedAt: TTable["deletedAt"] }
    : Record<never, never>);

type SelectFieldValue<
  TField extends ServerDefinedFields[string],
  TColumn,
> = TField["kind"] extends "file" | "image"
  ? SQL<SelectedMedia | null>
  : TColumn;

export function selectFields<
  TTable extends NumericIdTable,
  TSelection extends ServerDefinedFields,
>(table: TTable, selection: TSelection) {
  const columns = getTableColumns(table);
  const baseResult = {
    id: table.id,
    ...("createdAt" in table ? { createdAt: table.createdAt } : {}),
    ...("updatedAt" in table ? { updatedAt: table.updatedAt } : {}),
    ...("deletedAt" in table ? { deletedAt: table.deletedAt } : {}),
  } as SelectFieldsResult<TTable, TSelection>;

  for (const key in selection) {
    const field = selection[key];
    if (key in columns) {
      const column = columns[key];
      Object.assign(baseResult, {
        [key]: field.select?.({ key, field, column, columns }) ?? column,
      });
    }
  }

  return baseResult;
}
