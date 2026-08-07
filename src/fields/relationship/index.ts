import * as z from "zod";

import {
  configurable,
  defineField,
  type CommonFieldOptions,
  type FieldDefinition,
} from "../field";
import { configureFormProps } from "../internal/formConfiguration";

export const relationshipSchema = z.array(
  z.object({
    id: z.number(),
    label: z.string(),
  }),
);

export const singleRelationshipSchema = z.number().int().positive().nullable();

export function isSingleRelationshipField(
  field: FieldDefinition | undefined,
): field is FieldDefinition<"relationship"> & { mode: "single" } {
  return Boolean(
    field?.kind === "relationship" &&
    "mode" in field &&
    field.mode === "single",
  );
}

const multipleRelationshipField = defineField({
  ...configurable<{ mode: "multiple" }>("mode"),
  default: [],
  filterKind: "includes",
  zod: relationshipSchema,
  kind: "relationship",
});

const singleRelationshipField = defineField({
  ...configurable<{ mode: "single" }>("mode"),
  default: null,
  kind: "relationship",
  mode: "single",
  zod: singleRelationshipSchema,
});

type RelationshipFieldOptions<TSchema extends z.ZodType> =
  CommonFieldOptions & {
    default?: NoInfer<z.output<TSchema>>;
    zod?: TSchema;
  };

type ExactRelationshipFieldOptions<TConfig, TAllowed> = TConfig &
  Record<Exclude<keyof TConfig, keyof TAllowed>, never>;

type ConfiguredRelationshipField<
  TBase extends { default: unknown },
  TConfig extends object,
  TSchema extends z.ZodType,
> = Omit<TBase, keyof TConfig | "default" | "zod"> &
  Omit<TConfig, "default" | "zod"> & {
    default: "default" extends keyof TConfig
      ? z.output<TSchema>
      : TBase["default"];
    zod: TSchema;
  };

// One public factory keeps cardinality definition-owned while preserving the
// existing many-to-many relationshipField() surface.
export function relationshipField(): ReturnType<
  typeof multipleRelationshipField
>;
export function relationshipField<
  const TSchema extends z.ZodType = typeof singleRelationshipSchema,
  const TConfig extends RelationshipFieldOptions<TSchema> & {
    mode: "single";
  } = RelationshipFieldOptions<TSchema> & { mode: "single" },
>(
  config: ExactRelationshipFieldOptions<
    TConfig,
    RelationshipFieldOptions<TSchema> & { mode: "single" }
  >,
): ConfiguredRelationshipField<
  ReturnType<typeof singleRelationshipField>,
  TConfig,
  TSchema
>;
export function relationshipField<
  const TSchema extends z.ZodType = typeof relationshipSchema,
  const TConfig extends RelationshipFieldOptions<TSchema> & {
    mode?: "multiple";
  } = RelationshipFieldOptions<TSchema> & { mode?: "multiple" },
>(
  config: ExactRelationshipFieldOptions<
    TConfig,
    RelationshipFieldOptions<TSchema> & { mode?: "multiple" }
  >,
): ConfiguredRelationshipField<
  ReturnType<typeof multipleRelationshipField>,
  TConfig,
  TSchema
>;
export function relationshipField(
  config: {
    default?: unknown;
    mode?: "multiple" | "single";
    zod?: z.ZodType;
  } & Partial<FieldDefinition> = {},
) {
  const kind = "relationship";
  const configuredField = {
    ...(config.mode === "single"
      ? singleRelationshipField()
      : multipleRelationshipField()),
    ...config,
    kind,
  };

  return configureFormProps(configuredField, ["mode"]);
}
