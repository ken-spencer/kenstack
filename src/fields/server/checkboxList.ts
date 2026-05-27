import type { DefinedField } from "../types";
import type { ServerFieldDefaults } from ".";

export function checkboxListField(field: DefinedField): ServerFieldDefaults {
  return field.options?.length
    ? {
        behavior: {
          filter: { kind: "includes", options: field.options },
        },
      }
    : {};
}
