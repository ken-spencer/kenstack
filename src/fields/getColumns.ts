import snakeCase from "lodash-es/snakeCase";
import {
  boolean,
  date,
  integer,
  text,
  timestamp,
  varchar,
  type PgBooleanBuilderInitial,
  type PgDateStringBuilderInitial,
  type PgIntegerBuilderInitial,
  type PgColumnBuilderBase,
  type PgTextBuilderInitial,
  type PgTimestampBuilderInitial,
  type PgVarcharBuilderInitial,
} from "drizzle-orm/pg-core";

import type { DefinedField, DefinedFields } from "./types";

type ColumnBackedFieldKind =
  | "text"
  | "number"
  | "email"
  | "textarea"
  | "markdown"
  | "boolean"
  | "date"
  | "datetime"
  | "radio-button"
  | "checkbox-list"
  | "image";

type TextColumnBuilder = PgTextBuilderInitial<string, [string, ...string[]]>;

type FieldColumnBuilder<TField extends DefinedField> =
  TField["kind"] extends "email"
    ? PgVarcharBuilderInitial<string, [string, ...string[]], 320>
    : TField["kind"] extends "boolean"
      ? PgBooleanBuilderInitial<string>
      : TField["kind"] extends "number"
        ? PgIntegerBuilderInitial<string>
        : TField["kind"] extends "date"
          ? PgDateStringBuilderInitial<string>
          : TField["kind"] extends "datetime"
            ? PgTimestampBuilderInitial<string>
            : TField["kind"] extends "checkbox-list"
              ? ReturnType<TextColumnBuilder["array"]>
              : TField["kind"] extends "image"
                ? PgIntegerBuilderInitial<string>
                : TField["kind"] extends
                      | "text"
                      | "textarea"
                      | "markdown"
                      | "radio-button"
                  ? TextColumnBuilder
                  : never;

export type FieldColumns<TFields extends DefinedFields> = {
  [K in keyof TFields as TFields[K]["kind"] extends ColumnBackedFieldKind
    ? K
    : never]: FieldColumnBuilder<TFields[K]>;
};

export function getColumns<const TFields extends DefinedFields>(
  fields: TFields,
) {
  const columns: [string, PgColumnBuilderBase][] = [];

  Object.entries(fields).forEach(([key, field]) => {
    const columnName = snakeCase(key);

    if (
      field.kind === "text" ||
      field.kind === "textarea" ||
      field.kind === "markdown" ||
      field.kind === "radio-button"
    ) {
      columns.push([key, text(columnName)]);
    } else if (field.kind === "number") {
      columns.push([key, integer(columnName)]);
    } else if (field.kind === "email") {
      columns.push([key, varchar(columnName, { length: 320 })]);
    } else if (field.kind === "boolean") {
      columns.push([key, boolean(columnName)]);
    } else if (field.kind === "date") {
      columns.push([key, date(columnName)]);
    } else if (field.kind === "datetime") {
      columns.push([key, timestamp(columnName, { withTimezone: true })]);
    } else if (field.kind === "checkbox-list") {
      columns.push([key, text(columnName).array()]);
    } else if (field.kind === "image") {
      columns.push([key, integer(columnName)]);
    }
  });

  return Object.fromEntries(columns) as FieldColumns<TFields>;
}
