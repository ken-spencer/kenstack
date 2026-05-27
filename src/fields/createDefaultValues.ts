import type { DefinedFields } from "./types";

type DefaultValuesFromFields<TFields extends DefinedFields> = {
  [K in keyof TFields]: TFields[K]["default"];
};

export function createDefaultValues<const T extends DefinedFields>(fields: T) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      return [key, field.default];
    }),
  ) as DefaultValuesFromFields<T>;
}
