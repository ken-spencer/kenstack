import type { FieldOption, FieldOptions } from "./types";

type DefinedFieldFromOption<TField extends FieldOption> = Omit<
  TField,
  "__kenstackField" | "searchable" | "revisions"
> & {
  kind: TField["kind"];
  default: TField["default"];
  searchable: boolean;
  revisions: boolean;
};

type DefinedFieldsFromOptions<TFields extends FieldOptions> = {
  [K in keyof TFields]: DefinedFieldFromOption<TFields[K]>;
};

export function defineFields<const TFields extends FieldOptions>(
  options: TFields,
) {
  return Object.fromEntries(
    Object.entries(options).map(([key, field]) => {
      const { __kenstackField, ...definedField } = field;
      if (!__kenstackField) {
        throw new Error(`Field "${key}" must be created with a field helper.`);
      }

      return [
        key,
        {
          ...definedField,
          searchable: field.searchable === true,
          revisions: field.revisions ?? true,
        },
      ];
    }),
  ) as DefinedFieldsFromOptions<TFields>;
}
