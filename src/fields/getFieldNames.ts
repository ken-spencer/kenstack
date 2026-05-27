import type { DefinedFields } from "./types";

export function getFieldNames<const TFields extends DefinedFields>(
  fields: TFields,
) {
  return Object.keys(fields) as Extract<keyof TFields, string>[];
}
