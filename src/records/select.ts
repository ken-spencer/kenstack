import "server-only";

import { getTableColumns } from "drizzle-orm";
import type { SelectResultFields } from "drizzle-orm/query-builders/select.types";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import type { NumericIdTable } from "@kenstack/db/types";
import type { ServerDefinedFields } from "@kenstack/fields/internal/serverResolution";

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

export type SelectedFieldValues<
  TTable extends NumericIdTable,
  TSelection extends ServerDefinedFields,
> = SelectResultFields<SelectFieldsResult<TTable, TSelection>>;

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
> = TField extends {
  select: (...args: never[]) => infer TSelection;
}
  ? Exclude<TSelection, undefined>
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
  };

  for (const key in selection) {
    const field = selection[key];
    if (key in columns) {
      const column = columns[key];
      Object.assign(baseResult, {
        [key]: field.select?.({ key, field, column, columns }) ?? column,
      });
    }
  }

  return baseResult as SelectFieldsResult<TTable, TSelection>;
}
