import * as z from "zod";

import { email } from "@kenstack/zod/email";
import { imageSchema } from "@kenstack/zod/image";
import { mediaListSchema } from "@kenstack/zod/mediaList";
import { phone } from "@kenstack/zod/phone";
import { tagsSchema } from "@kenstack/zod/tags";
import { relationshipSchema } from "./relationshipSchema";
import type {
  FieldInputOption,
  FieldComponentLoader,
  FieldKind,
  FieldOption,
  MediaListUploadOptions,
} from "./types";

type FieldOptionOfKind<
  TKind extends FieldKind,
  TDefault,
  TOptions extends object = Record<never, never>,
> = FieldOption<TKind, TDefault> & TOptions;

type FieldOptionsFor<TKind extends FieldKind, TDefault> = Omit<
  FieldOption<TKind, TDefault>,
  "__kenstackField"
>;

type DefaultFromOptions<TOptions, TDefault> = TOptions extends {
  default: infer TOptionDefault;
}
  ? TOptionDefault
  : TDefault;

type CommonFieldOptions<TDefault = unknown> = {
  zod?: z.ZodType;
  default?: TDefault;
  label?: string;
  description?: string;
  component?: FieldComponentLoader;
  searchable?: boolean;
  revisions?: boolean;
  list?: boolean;
  filter?: boolean;
  sort?:
    | boolean
    | {
        defaultDirection?: "asc" | "desc";
      };
};

type DisplayFieldOptions = Pick<
  CommonFieldOptions,
  "label" | "description" | "revisions"
>;

type CheckboxListFieldOptions = Omit<
  CommonFieldOptions,
  "zod" | "default" | "searchable" | "sort"
> & {
  options: readonly FieldInputOption[];
  zod?: z.ZodType;
  default?: string[];
};

type RadioButtonFieldOptions = Omit<
  CommonFieldOptions<string>,
  "zod" | "searchable"
> & {
  options: readonly FieldInputOption[];
  zod?: z.ZodType;
};

type SelectFieldOptions = Omit<
  CommonFieldOptions<string>,
  "zod" | "searchable"
> & {
  options: readonly FieldInputOption[];
  placeholder?: string;
  zod?: z.ZodType;
};

type ImageFieldOptions = DisplayFieldOptions & {
  list?: boolean | "square" | "original";
};

type TagFieldOptions = DisplayFieldOptions & {
  list?: boolean;
  filter?: boolean;
};

type RelationshipFieldOptions = CommonFieldOptions<
  z.output<typeof relationshipSchema>
> & {
  list?: boolean;
  filter?: boolean;
};

type MediaListFieldOptions = DisplayFieldOptions &
  MediaListUploadOptions & {
    list?: boolean;
  };

const dateTimeSchema = z.union([
  z.date().transform((value) => value.toISOString()),
  z.string().datetime({ precision: 3 }),
  z.literal(""),
  z.null().transform(() => ""),
  z.undefined().transform(() => ""),
]);

const dateSchema = z.union([
  z.iso.date(),
  z
    .string()
    .datetime({ precision: 3 })
    .transform((value) => value.slice(0, 10)),
  z.date().transform((value) => value.toISOString().slice(0, 10)),
  z.literal(""),
  z.null().transform(() => ""),
  z.undefined().transform(() => ""),
]);

export function field<
  const TKind extends FieldKind,
  const TDefault,
  const TOptions extends FieldOptionsFor<TKind, TDefault>,
>(options: TOptions): FieldOptionOfKind<TKind, TDefault, TOptions> {
  return {
    __kenstackField: true,
    ...options,
  };
}

export function textField<
  const TOptions extends CommonFieldOptions<string> = Record<never, never>,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"text", string, TOptions> {
  return field({
    kind: "text",
    default: "",
    searchable: false,
    revisions: true,
    zod: z.string(),
    ...options,
  });
}

export function numberField<
  const TOptions extends CommonFieldOptions<number | null> = Record<
    never,
    never
  >,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"number", DefaultFromOptions<TOptions, number>, TOptions> {
  return field({
    kind: "number",
    default: 0,
    searchable: false,
    revisions: true,
    zod: z.coerce.number(),
    ...options,
  }) as unknown as FieldOptionOfKind<
    "number",
    DefaultFromOptions<TOptions, number>,
    TOptions
  >;
}

export function emailField<
  const TOptions extends CommonFieldOptions<string> = Record<never, never>,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"email", string, TOptions> {
  return field({
    kind: "email",
    default: "",
    searchable: false,
    revisions: true,
    zod: email,
    ...options,
  });
}

export function phoneField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"text", string> {
  return field({
    kind: "text",
    default: "",
    searchable: false,
    revisions: true,
    zod: phone,
    ...options,
  });
}

export function textareaField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"textarea", string> {
  return field({
    kind: "textarea",
    default: "",
    searchable: false,
    revisions: true,
    zod: z.string(),
    ...options,
  });
}

export function markdownField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"markdown", string> {
  return field({
    kind: "markdown",
    default: "",
    searchable: false,
    revisions: true,
    zod: z.string(),
    display({ value }) {
      return import("@kenstack/components/Markdown/mdToHtml").then(
        ({ default: mdToHtml }) =>
          mdToHtml(typeof value === "string" ? value : ""),
      );
    },
    ...options,
  });
}

export function booleanField(
  options: CommonFieldOptions<boolean> = {},
): FieldOptionOfKind<"boolean", boolean> {
  return field({
    kind: "boolean",
    default: false,
    searchable: false,
    revisions: true,
    zod: z.boolean(),
    ...options,
  });
}

export function slugField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"text", string> {
  return field({
    kind: "text",
    default: "",
    searchable: false,
    revisions: true,
    zod: z
      .string()
      .trim()
      .min(1, "Slug is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens.",
      ),
    ...options,
  });
}

export function radioButtonField<
  const TOptions extends RadioButtonFieldOptions,
>(options: TOptions): FieldOptionOfKind<"radio-button", string, TOptions> {
  const defaultValue = options.default ?? "";

  return field({
    kind: "radio-button",
    default: defaultValue,
    searchable: false,
    revisions: true,
    zod:
      options.zod ??
      z.enum(
        Array.from(
          new Set([defaultValue, ...options.options.map(({ value }) => value)]),
        ),
    ),
    ...options,
  });
}

export function selectField<const TOptions extends SelectFieldOptions>(
  options: TOptions,
): FieldOptionOfKind<"select", string, TOptions> {
  const defaultValue = options.default ?? "";

  return field({
    kind: "select",
    default: defaultValue,
    searchable: false,
    revisions: true,
    zod:
      options.zod ??
      z.enum(
        Array.from(
          new Set([defaultValue, ...options.options.map(({ value }) => value)]),
        ),
      ),
    display({ value }) {
      if (typeof value !== "string") {
        return "";
      }

      return (
        options.options.find((option) => option.value === value)?.label ?? value
      );
    },
    ...options,
  });
}

export function dateTimeField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"datetime", string> {
  return field({
    kind: "datetime",
    default: "",
    searchable: false,
    revisions: true,
    zod: dateTimeSchema,
    ...options,
  });
}

export function dateField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"date", string> {
  return field({
    kind: "date",
    default: "",
    searchable: false,
    revisions: true,
    zod: dateSchema,
    ...options,
  });
}

export function checkboxListField({
  default: defaultValue = [],
  filter = true,
  ...options
}: CheckboxListFieldOptions): FieldOptionOfKind<"checkbox-list", string[]> {
  return field({
    kind: "checkbox-list",
    default: defaultValue,
    filter,
    searchable: false,
    revisions: true,
    zod: z.array(z.enum(options.options.map(({ value }) => value))),
    ...options,
  });
}

export function imageField<
  const TOptions extends ImageFieldOptions = Record<never, never>,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"image", null, TOptions> {
  return field({
    kind: "image",
    default: null,
    searchable: false,
    revisions: true,
    zod: imageSchema,
    ...options,
  });
}

export function mediaListField(
  options: MediaListFieldOptions = {},
): FieldOptionOfKind<"media-list", [], MediaListFieldOptions> {
  return field({
    kind: "media-list",
    default: [],
    searchable: false,
    revisions: true,
    zod: mediaListSchema,
    ...options,
  });
}

export function tagField(
  options: TagFieldOptions = {},
): FieldOptionOfKind<"tags", []> {
  return field({
    kind: "tags",
    default: [],
    searchable: false,
    revisions: true,
    zod: tagsSchema,
    ...options,
  });
}

export function relationshipField(
  options: RelationshipFieldOptions = {},
): FieldOptionOfKind<"relationship", z.output<typeof relationshipSchema>> {
  return field({
    kind: "relationship",
    default: [],
    searchable: false,
    revisions: true,
    zod: relationshipSchema,
    ...options,
  });
}
