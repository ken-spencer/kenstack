/*
 * Public entry point: the isomorphic field-definition API for host applications.
 * This entry point must not import field components or server implementations.
 */

import * as z from "zod";

import { configurable, defineField, type FieldInputOption } from "./field";

export * from "./field";
export * from "./address";
export * from "./date";
export * from "./dateTime";
export * from "./email";
export * from "./file";
export * from "./image";
export * from "./mediaList";
export * from "./phone";
export * from "./relationship";
export * from "./tags";
export * from "./unsecureId";
export * from "./createSchemaFromFields";
export * from "./createDefaultValues";
export * from "./getFieldNames";

function enumFromOptions(
  defaultValue: string,
  options: readonly FieldInputOption[],
) {
  return z.enum(
    Array.from(new Set([defaultValue, ...options.map(({ value }) => value)])),
  );
}

export const booleanField = defineField({
  kind: "boolean",
  default: false,
  filterKind: "boolean",
  zod: z.boolean(),
});

export const checkboxListField = defineField({
  kind: "checkbox-list",
  options: true,
  default: [],
  filterKind: "includes",
  zod: ({ options }) => z.array(z.enum(options.map(({ value }) => value))),
});

export const comboboxField = defineField({
  ...configurable<{
    emptyMessage?: string;
    showClear?: boolean;
  }>("emptyMessage", "showClear"),
  kind: "combobox",
  options: true,
  default: "",
  filterKind: "enum",
  zod: ({ options }) => enumFromOptions("", options),
});

export const markdownField = defineField({
  kind: "markdown",
  default: "",
  zod: z.string(),
});

export const moneyField = defineField({
  default: null,
  zod: z.int().nonnegative("Amount cannot be negative").nullable(),
  kind: "money",
});

export const numberField = defineField({
  ...configurable<{
    max?: number;
    min?: number;
    step?: number;
  }>("max", "min", "step"),
  zod: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().nullable(),
  ),
  default: null,
  kind: "number",
});

export const radioButtonField = defineField({
  kind: "radio-button",
  options: true,
  default: "",
  filterKind: "enum",
  zod: ({ options }) => enumFromOptions("", options),
});

export const selectField = defineField({
  kind: "select",
  options: true,
  default: "",
  filterKind: "enum",
  zod: ({ options }) => enumFromOptions("", options),
});

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .regex(
    /^(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/,
    "Use lowercase letters, numbers, and hyphens.",
  );

export const slugField = defineField({
  default: "",
  filterKind: "text",
  zod: slugSchema,
  kind: "slug",
});

export const textField = defineField({
  kind: "text",
  default: "",
  filterKind: "text",
  zod: z.string(),
});

export const textareaField = defineField({
  kind: "textarea",
  default: "",
  zod: z.string(),
});

export const urlField = defineField({
  kind: "url",
  default: "",
  filterKind: "text",
  zod: z
    .string()
    .trim()
    .pipe(z.url("Enter a valid URL").or(z.literal(""))),
});
