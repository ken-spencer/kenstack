import type { FieldDefinition } from "./field";

export function getFieldNames<
  const TFields extends Record<string, FieldDefinition>,
>(fields: TFields & (keyof TFields extends string ? unknown : never)) {
  return Object.keys(fields) as Extract<keyof TFields, string>[];
}
