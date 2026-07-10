import type { DefinedField } from "../types";
import type { ServerField } from ".";

export function checkboxListField(field: DefinedField): ServerField {
  return field.options?.length
    ? { filterConfig: { kind: "includes", options: field.options } }
    : {};
}
