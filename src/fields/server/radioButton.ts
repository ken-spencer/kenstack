import type { DefinedField } from "../types";
import type { ServerField } from ".";

export function radioButtonField(field: DefinedField): ServerField {
  return field.options?.length
    ? { filterConfig: { kind: "enum", options: field.options } }
    : {};
}
