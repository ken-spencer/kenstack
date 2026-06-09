import type { DefinedField } from "../types";
import type { ServerFieldDefaults } from ".";

export function radioButtonField(field: DefinedField): ServerFieldDefaults {
  return field.options?.length
    ? {
        behavior: {
          filter: { kind: "enum", options: field.options },
        },
      }
    : {};
}
