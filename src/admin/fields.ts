/*
 * Public entry point: the admin field-definition API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import {
  attachFieldSetRefinements,
  type FieldSetSuperRefine,
} from "../fields/internal/fieldSetRefinements";
import {
  type FieldDefinition,
  type FieldKind,
  type FieldOptions,
} from "../fields/field";
import * as z from "zod";

import type { metaFieldOptions } from "./metaFields";

export type { FieldSetSuperRefine };

export type FieldSetSuperRefineOption<
  TValues extends Record<string, unknown> = Record<string, unknown>,
> = FieldSetSuperRefine<TValues> | readonly FieldSetSuperRefine<TValues>[];

export type DefinedField<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = Omit<FieldDefinition<TKind, TDefault>, "searchable" | "revisions"> & {
  searchable: boolean;
  revisions: boolean;
};

export type DefinedFields = Record<string, DefinedField>;

export type DefinedFieldsFromOptions<TFields extends FieldOptions> = {
  [K in keyof TFields]: Omit<
    TFields[K],
    "__kenstackField" | "kind" | "searchable" | "revisions"
  > & {
    kind: TFields[K] extends { kind: infer TKind extends FieldKind }
      ? TKind
      : Extract<K, string>;
    searchable: boolean;
    revisions: boolean;
  };
};

type FieldValuesFromOptions<TFields extends FieldOptions> = {
  [K in keyof TFields]: z.output<TFields[K]["zod"]>;
};

// The publication and SEO fields defineModule adds from the table flags are
// part of the values a refinement receives, present when the table has them.
type GeneratedFieldValues = Partial<{
  [K in keyof typeof metaFieldOptions]: z.output<
    (typeof metaFieldOptions)[K]["zod"]
  >;
}>;

export function defineFields<const TFields extends FieldOptions>({
  superRefine,
  fields,
}: {
  superRefine?: FieldSetSuperRefineOption<
    FieldValuesFromOptions<TFields> & Omit<GeneratedFieldValues, keyof TFields>
  >;
  fields: TFields;
}): DefinedFieldsFromOptions<TFields> {
  const definedFields = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      const { __kenstackField, ...definedField } = field;
      if (!__kenstackField) {
        throw new Error(`Field "${key}" must be created with a field helper.`);
      }

      return [
        key,
        {
          ...definedField,
          kind: field.kind ?? key,
          searchable: field.searchable === true,
          revisions: field.revisions ?? true,
        },
      ];
    }),
  ) as DefinedFieldsFromOptions<TFields>;

  return attachFieldSetRefinements(definedFields, {
    from: fields,
    superRefine,
  }) as DefinedFieldsFromOptions<TFields>;
}
