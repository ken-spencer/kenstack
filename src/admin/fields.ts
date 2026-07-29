import {
  attachFieldSetRefinements,
  type FieldSetSuperRefineOption,
} from "../fields/fieldSetRefinements";
import {
  attachOneToOneFieldSets,
  type FieldsWithOneToOne,
} from "../fields/oneToOneFieldSets";
import { createDefaultValues } from "../fields/createDefaultValues";
import type {
  DefaultValuesFromFields,
  FieldOption,
  FieldOptions,
} from "../fields/types";
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

type OneToOneOptions = Record<
  string,
  {
    fields: FieldOptions;
    superRefine?: FieldSetSuperRefineOption;
  }
>;

type DefinedOneToOne<TOneToOne extends OneToOneOptions | undefined> =
  TOneToOne extends OneToOneOptions
    ? {
        [K in keyof TOneToOne]: {
          fields: DefinedFieldsFromOptions<TOneToOne[K]["fields"]>;
          defaultValues: DefaultValuesFromFields<
            DefinedFieldsFromOptions<TOneToOne[K]["fields"]>
          >;
        };
      }
    : Record<never, never>;

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
  TOneToOne extends OneToOneOptions | undefined,
  TPublish extends boolean | undefined,
  TSeo extends boolean | undefined,
> = {
  publish?: TPublish;
  superRefine?: FieldSetSuperRefineOption<
    FieldValuesFromOptions<TFields & GeneratedAdminFieldOptions<TPublish, TSeo>>
  >;
  seo?: TSeo;
  fields: TFields & GeneratedFieldConflictGuard<TPublish, TSeo>;
  oneToOne?: TOneToOne;
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
  const TOneToOne extends OneToOneOptions | undefined = undefined,
  const TPublish extends boolean | undefined = false,
  const TSeo extends boolean | undefined = false,
>({
  publish,
  superRefine,
  seo,
  fields,
  oneToOne,
}: DefineFieldsOptions<TFields, TOneToOne, TPublish, TSeo>): FieldsWithOneToOne<
  DefinedFieldsFromOptions<
    TFields & GeneratedAdminFieldOptions<TPublish, TSeo>
  >,
  DefinedOneToOne<TOneToOne>
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

  const relationEntries = oneToOne ? Object.entries(oneToOne) : [];
  for (const [name] of relationEntries) {
    if (name in allFields) {
      throw new Error(
        `One-to-one field set "${name}" conflicts with field "${name}".`,
      );
    }
  }

  const defineFieldSet = <const TOptions extends FieldOptions>(
    fieldOptions: TOptions,
    setName?: string,
  ) =>
    Object.fromEntries(
      Object.entries(fieldOptions).map(([key, field]) => {
        const { __kenstackField, ...definedField } = field;
        if (!__kenstackField) {
          const location = setName
            ? ` in one-to-one field set "${setName}"`
            : "";
          throw new Error(
            `Field "${key}"${location} must be created with a field helper.`,
          );
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
    ) as DefinedFieldsFromOptions<TOptions>;

  const definedFields = defineFieldSet(allFields);
  const definedRelations = Object.fromEntries(
    relationEntries.map(([name, fieldSet]) => {
      if ("id" in fieldSet.fields) {
        throw new Error(
          `One-to-one field set "${name}" cannot define the reserved field "id".`,
        );
      }

      const relatedFields = attachFieldSetRefinements(
        defineFieldSet(fieldSet.fields, name),
        {
          from: fieldSet.fields,
          superRefine: fieldSet.superRefine,
        },
      );

      return [
        name,
        {
          fields: relatedFields,
          defaultValues: createDefaultValues(relatedFields),
        },
      ];
    }),
  ) as DefinedOneToOne<TOneToOne>;

  return attachOneToOneFieldSets(
    attachFieldSetRefinements(definedFields, {
      from: allFields,
      superRefine,
    }),
    definedRelations,
  );
}
