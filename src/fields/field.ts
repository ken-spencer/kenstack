import type { ComponentType, SVGProps } from "react";
import * as z from "zod";

import {
  configureFormProps,
  declareFormProperties,
} from "./internal/formConfiguration";

// Kinds are open so modules can give a field implementation a semantic name.
export type FieldKind = string;

export type FieldCheckedValue = boolean | null | number | string;

export type FieldInputOption = {
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
};

export type MediaUploadOptions = {
  accept?: readonly string[];
  uploadMaxSize?: number;
  uploadMaxSizeMessage?: string;
};

// The shared surface every field owes the admin infrastructure. Kind-specific
// configuration is not declared here: a base definition adds its own keys with
// configurable<...>() and they flow through the factory automatically.
export type FieldDefinition<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = {
  kind: TKind;
  zod: z.ZodType;
  default: TDefault;
  filterKind?: "boolean" | "date-range" | "enum" | "includes" | "text";
  label?: string;
  description?: string;
  searchable?: boolean;
  revisions?: boolean;
  list?: boolean | "square" | "original";
  filter?: boolean;
  sort?:
    | boolean
    | {
        defaultDirection?: "asc" | "desc";
      };
};

// Declares extra configurable keys on a base definition. Properties named here
// are captured as editor props when the field is configured; other extras stay
// available to server and record infrastructure without reaching the editor.
export function configurable<TExtras extends object>(
  ...formProperties: readonly Extract<keyof TExtras, string>[]
): Partial<TExtras> {
  return declareFormProperties<TExtras>(formProperties);
}

export type FieldOption<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = { __kenstackField: true } & FieldDefinition<TKind, TDefault>;

export type AnonymousFieldOption<TDefault = unknown> = {
  __kenstackField: true;
  kind?: undefined;
} & Omit<FieldDefinition<FieldKind, TDefault>, "kind">;

export type FieldOptions = Record<string, FieldOption | AnonymousFieldOption>;

export type CommonFieldOptions = Pick<
  FieldDefinition,
  | "label"
  | "description"
  | "searchable"
  | "revisions"
  | "list"
  | "filter"
  | "sort"
> & {
  placeholder?: string;
};

type FieldFactoryOptions<
  TBase extends FieldDefinition,
  TRequired extends object,
> = CommonFieldOptions & Omit<TBase, keyof FieldDefinition> & TRequired;

type ExactFieldConfig<TConfig, TAllowed> = TConfig &
  Record<Exclude<keyof TConfig, keyof TAllowed>, never>;

type ConfiguredField<
  TBase extends FieldDefinition,
  TSchema extends z.ZodType,
  TConfig extends object,
> = { __kenstackField: true } & Omit<TBase, keyof TConfig | "zod" | "default"> &
  Omit<CommonFieldOptions, "placeholder"> &
  Omit<TConfig, "zod" | "default" | "kind"> & {
    kind: TBase["kind"];
    zod: TSchema;
    default: "default" extends keyof TConfig
      ? z.output<TSchema>
      : TBase["default"];
  };

type ConfigurableFieldFactory<
  TBase extends FieldDefinition,
  TRequired extends object,
> = {
  <
    const TConfig extends FieldFactoryOptions<TBase, TRequired> & {
      default?: NoInfer<z.output<TBase["zod"]>>;
    },
  >(
    config: ExactFieldConfig<
      TConfig,
      FieldFactoryOptions<TBase, TRequired> & {
        default?: NoInfer<z.output<TBase["zod"]>>;
        zod?: never;
        kind?: never;
      }
    > & { zod?: never; kind?: never },
  ): ConfiguredField<TBase, TBase["zod"], TConfig>;
  <
    const TConfig extends FieldFactoryOptions<TBase, TRequired> & {
      zod: z.ZodType;
      default?: unknown;
    },
  >(
    config: ExactFieldConfig<
      TConfig & {
        default?: NoInfer<z.output<TConfig["zod"]>>;
      },
      FieldFactoryOptions<TBase, TRequired> & {
        zod: z.ZodType;
        default?: unknown;
        kind?: never;
      }
    > & { kind?: never },
  ): ConfiguredField<TBase, TConfig["zod"], TConfig>;
};

export type FieldFactory<
  TBase extends FieldDefinition,
  TRequired extends object = Record<never, never>,
> = ConfigurableFieldFactory<TBase, TRequired> & {
  readonly kind: TBase["kind"];
} & ([keyof TRequired] extends [never]
    ? {
        (): ConfiguredField<TBase, TBase["zod"], Record<never, never>>;
      }
    : unknown);

type FieldOptionsConfig = {
  options: readonly FieldInputOption[];
};

type OptionFieldDefinitionInput = Omit<FieldDefinition, "zod"> & {
  options: true;
  zod: (config: FieldOptionsConfig) => z.ZodType;
};

type FactoryDefault<TDefault, TSchema extends z.ZodType> = [TDefault] extends [
  null,
]
  ? null
  : z.output<TSchema>;

type ValidFieldDefinition<TDefault, TSchema extends z.ZodType> = [
  TDefault,
] extends [null]
  ? unknown
  : TDefault extends readonly []
    ? z.output<TSchema> extends readonly unknown[]
      ? unknown
      : never
    : TDefault extends z.output<TSchema>
      ? unknown
      : never;

type SchemaDefault<TSchema extends z.ZodType> =
  unknown extends z.input<TSchema>
    ? z.output<TSchema>
    : Exclude<z.input<TSchema>, undefined>;

type ConcreteFieldDefault<TDefault, TSchema extends z.ZodType> = [
  TDefault,
] extends [null]
  ? null
  : TDefault extends readonly unknown[]
    ? [TDefault[number]] extends [never]
      ? SchemaDefault<TSchema>
      : TDefault
    : TDefault extends object
      ? keyof TDefault extends never
        ? SchemaDefault<TSchema>
        : TDefault
      : TDefault;

// Empty seeds are checked as members of the schema type, not merely against
// its shape, so a schema with required entries rejects a default it cannot
// honestly satisfy.
type ValidConcreteFieldDefault<TDefault, TSchema extends z.ZodType> = [
  TDefault,
] extends [null]
  ? unknown
  : TDefault extends readonly unknown[]
    ? [TDefault[number]] extends [never]
      ? [...TDefault] extends SchemaDefault<TSchema>
        ? unknown
        : never
      : TDefault extends SchemaDefault<TSchema>
        ? unknown
        : never
    : TDefault extends SchemaDefault<TSchema>
      ? unknown
      : never;

type ConcreteFieldDefinition = Omit<FieldDefinition, "kind"> & {
  kind?: FieldKind;
};

type ConcreteField<TDefinition extends ConcreteFieldDefinition> =
  TDefinition extends { kind: infer TKind extends FieldKind }
    ? FieldOption<
        TKind,
        ConcreteFieldDefault<TDefinition["default"], TDefinition["zod"]>
      > &
        Omit<TDefinition, "default">
    : AnonymousFieldOption<
        ConcreteFieldDefault<TDefinition["default"], TDefinition["zod"]>
      > &
        Omit<TDefinition, "default">;

export function field<const TDefinition extends ConcreteFieldDefinition>(
  options: TDefinition &
    ValidConcreteFieldDefault<TDefinition["default"], TDefinition["zod"]>,
): ConcreteField<TDefinition>;
export function field(
  options: ConcreteFieldDefinition,
): FieldOption | AnonymousFieldOption {
  return configureFormProps({
    __kenstackField: true,
    ...options,
  });
}

export function defineField<
  const TDefinition extends OptionFieldDefinitionInput,
>(
  base: TDefinition &
    ValidFieldDefinition<
      TDefinition["default"],
      ReturnType<TDefinition["zod"]>
    >,
): FieldFactory<
  Omit<TDefinition, "default" | "options" | "zod"> & {
    default: FactoryDefault<
      TDefinition["default"],
      ReturnType<TDefinition["zod"]>
    >;
    options: readonly FieldInputOption[];
    zod: ReturnType<TDefinition["zod"]>;
  },
  FieldOptionsConfig
>;
export function defineField<const TDefinition extends FieldDefinition>(
  base: TDefinition &
    ValidFieldDefinition<TDefinition["default"], TDefinition["zod"]>,
): FieldFactory<
  Omit<TDefinition, "default"> & {
    default: FactoryDefault<TDefinition["default"], TDefinition["zod"]>;
  }
>;
export function defineField(
  base: (FieldDefinition & { options?: never }) | OptionFieldDefinitionInput,
) {
  if (base.options === true) {
    const { kind, zod: createZod, ...definition } = base;

    return Object.assign(
      (config: FieldOptionsConfig & { zod?: z.ZodType }) => {
        const { zod, ...configured } = { ...definition, ...config };

        return configureFormProps(
          {
            __kenstackField: true,
            ...configured,
            zod: zod ?? createZod({ options: config.options }),
            kind,
          },
          ["options"],
        );
      },
      { kind },
    );
  }

  const { kind, ...definition } = base;

  return Object.assign(
    (config: object = {}) =>
      configureFormProps({
        __kenstackField: true,
        ...definition,
        ...config,
        kind,
      }),
    { kind },
  );
}

// filter accepts true only for pairs a list filter can query: string pairs
// derive enum choices and boolean pairs filter as booleans. The runtime guard
// in checkedFieldConfig covers untyped callers.
type CheckedFilterOption<
  TChecked extends FieldCheckedValue,
  TUnchecked extends FieldCheckedValue,
> = [TChecked, TUnchecked] extends [string, string] | [boolean, boolean]
  ? unknown
  : { filter?: false };

type CheckedFieldOptions<
  TChecked extends FieldCheckedValue,
  TUnchecked extends FieldCheckedValue,
> = CommonFieldOptions & {
  checked: TChecked;
  default?: NoInfer<TChecked | TUnchecked>;
  unchecked: TUnchecked;
};

const checkedValueSchema = z.union([
  z.boolean(),
  z.null(),
  z.number(),
  z.string(),
]);

// No options key: a checked field's enum-filter choices derive from its two values.
const checkedFieldExtras = configurable<{
  checked: FieldCheckedValue;
  unchecked: FieldCheckedValue;
}>("checked", "unchecked");

const configurableCheckboxField = defineField({
  ...checkedFieldExtras,
  default: null,
  filterKind: "enum",
  kind: "checkbox",
  zod: checkedValueSchema,
});

const configurableToggleField = defineField({
  ...checkedFieldExtras,
  default: null,
  filterKind: "enum",
  kind: "toggle",
  zod: checkedValueSchema,
});

function checkedFieldConfig<
  const TChecked extends FieldCheckedValue,
  const TUnchecked extends FieldCheckedValue,
>(
  kind: "checkbox" | "toggle",
  options: CheckedFieldOptions<TChecked, TUnchecked>,
) {
  const { checked, default: configuredDefault, unchecked, ...config } = options;
  const checkedValue: FieldCheckedValue = checked;
  if (checkedValue === unchecked) {
    throw new Error(
      `Field kind "${kind}" requires different checked and unchecked values.`,
    );
  }

  const filterableValues =
    (typeof checked === "string" && typeof unchecked === "string") ||
    (typeof checked === "boolean" && typeof unchecked === "boolean");
  if (config.filter === true && !filterableValues) {
    throw new Error(
      `Field kind "${kind}" supports filtering only for string or boolean checked values.`,
    );
  }

  return {
    ...config,
    checked,
    default: configuredDefault === undefined ? unchecked : configuredDefault,
    unchecked,
    zod: checkedValuesSchema(checked, unchecked),
  };
}

export function checkboxField<
  const TChecked extends FieldCheckedValue,
  const TUnchecked extends FieldCheckedValue,
>(
  options: CheckedFieldOptions<TChecked, TUnchecked> &
    CheckedFilterOption<TChecked, TUnchecked>,
) {
  return configurableCheckboxField(checkedFieldConfig("checkbox", options));
}

export function toggleField<
  const TChecked extends FieldCheckedValue,
  const TUnchecked extends FieldCheckedValue,
>(
  options: CheckedFieldOptions<TChecked, TUnchecked> &
    CheckedFilterOption<TChecked, TUnchecked>,
) {
  return configurableToggleField(checkedFieldConfig("toggle", options));
}

function checkedValuesSchema<
  TChecked extends FieldCheckedValue,
  TUnchecked extends FieldCheckedValue,
>(checked: TChecked, unchecked: TUnchecked) {
  return z.custom<TChecked | TUnchecked>(
    (value) => value === checked || value === unchecked,
  );
}
