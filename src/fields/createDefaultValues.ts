import type { DefaultValuesFromFields, DefinedFields } from "./types";

export function createDefaultValues<const T extends DefinedFields>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      return [key, field.default];
    }),
  ) as DefaultValuesFromFields<T>;
}
