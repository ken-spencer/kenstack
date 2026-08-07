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
import { metaFieldOptions } from "./metaFields";

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

type GeneratedAdminFieldOptions<
  TPublish extends boolean | undefined,
  TSeo extends boolean | undefined,
> = ([TPublish] extends [true]
  ? Pick<typeof metaFieldOptions, "visibility" | "publishedAt">
  : Record<never, never>) &
  ([TSeo] extends [true]
    ? Pick<typeof metaFieldOptions, "seoTitle" | "seoDescription" | "ogImage">
    : Record<never, never>);

type GeneratedFieldConflictGuard<
  TPublish extends boolean | undefined,
  TSeo extends boolean | undefined,
> = ([TPublish] extends [true]
  ? { visibility?: never; publishedAt?: never }
  : unknown) &
  ([TSeo] extends [true]
    ? { seoTitle?: never; seoDescription?: never; ogImage?: never }
    : unknown);

type DefineFieldsOptions<
  TFields extends FieldOptions,
  TPublish extends boolean | undefined,
  TSeo extends boolean | undefined,
> = {
  publish?: TPublish;
  superRefine?: FieldSetSuperRefineOption<
    FieldValuesFromOptions<TFields & GeneratedAdminFieldOptions<TPublish, TSeo>>
  >;
  seo?: TSeo;
  fields: TFields & GeneratedFieldConflictGuard<TPublish, TSeo>;
};

function assertGeneratedFieldAvailable(
  fields: FieldOptions,
  key: string,
  option: string,
) {
  if (key in fields) {
    throw new Error(
      `Field "${key}" cannot be defined manually when ${option} is enabled.`,
    );
  }
}

export function defineFields<
  const TFields extends FieldOptions,
  const TPublish extends boolean | undefined = false,
  const TSeo extends boolean | undefined = false,
>({
  publish,
  superRefine,
  seo,
  fields,
}: DefineFieldsOptions<TFields, TPublish, TSeo>): DefinedFieldsFromOptions<
  TFields & GeneratedAdminFieldOptions<TPublish, TSeo>
> {
  if (publish) {
    assertGeneratedFieldAvailable(fields, "visibility", "publish: true");
    assertGeneratedFieldAvailable(fields, "publishedAt", "publish: true");
  }

  if (seo) {
    assertGeneratedFieldAvailable(fields, "seoTitle", "seo: true");
    assertGeneratedFieldAvailable(fields, "seoDescription", "seo: true");
    assertGeneratedFieldAvailable(fields, "ogImage", "seo: true");
  }

  const allFields = {
    ...fields,
    ...(publish
      ? {
          visibility: metaFieldOptions.visibility,
          publishedAt: metaFieldOptions.publishedAt,
        }
      : {}),
    ...(seo
      ? {
          seoTitle: metaFieldOptions.seoTitle,
          seoDescription: metaFieldOptions.seoDescription,
          ogImage: metaFieldOptions.ogImage,
        }
      : {}),
  } as TFields & GeneratedAdminFieldOptions<TPublish, TSeo>;

  const defineFieldSet = <const TOptions extends FieldOptions>(
    fieldOptions: TOptions,
  ) =>
    Object.fromEntries(
      Object.entries(fieldOptions).map(([key, field]) => {
        const { __kenstackField, ...definedField } = field;
        if (!__kenstackField) {
          throw new Error(
            `Field "${key}" must be created with a field helper.`,
          );
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
    ) as DefinedFieldsFromOptions<TOptions>;

  const definedFields = defineFieldSet(allFields);
  return attachFieldSetRefinements(definedFields, {
    from: allFields,
    superRefine,
  }) as DefinedFieldsFromOptions<
    TFields & GeneratedAdminFieldOptions<TPublish, TSeo>
  >;
}
