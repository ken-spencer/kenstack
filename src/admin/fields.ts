import {
  attachFieldSetRefinements,
  type FieldSetSuperRefineOption,
} from "../fields/fieldSetRefinements";
import type { FieldOption, FieldOptions } from "../fields/types";
import type * as z from "zod";
import { metaFieldOptions } from "./metaFields";

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
  const TPublish extends boolean | undefined = undefined,
  const TSeo extends boolean | undefined = undefined,
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

  const definedFields = Object.fromEntries(
    Object.entries(allFields).map(([key, field]) => {
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
  ) as DefinedFieldsFromOptions<typeof allFields>;

  return attachFieldSetRefinements(definedFields, {
    from: allFields,
    superRefine,
  });
}
