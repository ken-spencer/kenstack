import * as z from "zod";

import { email } from "@kenstack/zod/email";
import { imageSchema } from "@kenstack/zod/image";
import { mediaListSchema } from "@kenstack/zod/mediaList";
import { phone } from "@kenstack/zod/phone";
import { tagsSchema } from "@kenstack/zod/tags";
import MediaListField from "@kenstack/admin/forms/MediaListField";
import AdminImageField from "@kenstack/admin/forms/ImageField";
import RelationshipField from "@kenstack/admin/forms/RelationshipField";
import TagField from "@kenstack/admin/forms/TagField";
import CheckboxField from "@kenstack/forms/CheckboxField";
import CheckboxList from "@kenstack/forms/CheckboxList";
import DateField from "@kenstack/forms/DateField";
import DateTimeField from "@kenstack/forms/DateTimeField";
import InputField from "@kenstack/forms/InputField";
import PhoneField from "@kenstack/forms/PhoneField";
import RadioButtonField from "@kenstack/forms/RadioButtonField";
import SlugField from "@kenstack/forms/SlugField";
import TextareaField from "@kenstack/forms/TextareaField";
import { relationshipSchema } from "./relationshipSchema";
import type {
  FieldComponentProps,
  FieldInputOption,
  FieldKind,
  FieldOption,
  FieldRecordRefinement,
} from "./types";

type FieldOptionOfKind<
  TKind extends FieldKind,
  TDefault,
  TOptions extends object = Record<never, never>,
> = FieldOption<TKind, TDefault> & TOptions;

type CommonFieldOptions<TDefault = unknown> = {
  zod?: z.ZodType;
  default?: TDefault;
  label?: string;
  description?: string;
  recordRefinement?: FieldRecordRefinement;
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

type ImageFieldOptions = DisplayFieldOptions & {
  list?: boolean | "square" | "original";
};

type TagFieldOptions = DisplayFieldOptions & {
  list?: boolean;
  filter?: boolean;
};

type RelationshipFieldOptions = DisplayFieldOptions & {
  list?: boolean;
  filter?: boolean;
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

function TextFieldComponent(props: FieldComponentProps) {
  return <InputField {...props} />;
}

function NumberFieldComponent(props: FieldComponentProps) {
  return <InputField {...props} type="number" />;
}

function EmailFieldComponent(props: FieldComponentProps) {
  return <InputField {...props} type="email" />;
}

function PhoneFieldComponent(props: FieldComponentProps) {
  return <PhoneField {...props} />;
}

function TextareaFieldComponent(props: FieldComponentProps) {
  return <TextareaField {...props} />;
}

function CheckboxFieldComponent(props: FieldComponentProps) {
  return <CheckboxField {...props} />;
}

function CheckboxListFieldComponent({
  options,
  ...props
}: FieldComponentProps) {
  return (
    <CheckboxList
      {...props}
      options={options?.map(({ label, value }) => ({ label, value })) ?? []}
    />
  );
}

function RadioButtonFieldComponent(props: FieldComponentProps) {
  return <RadioButtonField {...props} options={props.options ?? []} />;
}

function DateTimeFieldComponent(props: FieldComponentProps) {
  return <DateTimeField {...props} />;
}

function DateFieldComponent(props: FieldComponentProps) {
  return <DateField {...props} />;
}

function SlugFieldComponent(props: FieldComponentProps) {
  return <SlugField {...props} />;
}

function ImageFieldComponent(props: FieldComponentProps) {
  return <AdminImageField {...props} />;
}

function MediaListFieldComponent(props: FieldComponentProps) {
  return <MediaListField {...props} />;
}

function TagFieldComponent(props: FieldComponentProps) {
  return <TagField {...props} />;
}

function RelationshipFieldComponent(props: FieldComponentProps) {
  return <RelationshipField {...props} relationship={props.name} />;
}

export function textField<
  const TOptions extends CommonFieldOptions<string> = Record<never, never>,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"text", string, TOptions> {
  return {
    __kenstackField: true,
    kind: "text",
    component: TextFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: z.string(),
    ...options,
  };
}

export function numberField(
  options: CommonFieldOptions<number> = {},
): FieldOptionOfKind<"number", number> {
  return {
    __kenstackField: true,
    kind: "number",
    component: NumberFieldComponent,
    default: 0,
    searchable: false,
    revisions: true,
    zod: z.coerce.number(),
    ...options,
  };
}

export function emailField<
  const TOptions extends CommonFieldOptions<string> = Record<never, never>,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"email", string, TOptions> {
  return {
    __kenstackField: true,
    kind: "email",
    component: EmailFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: email,
    ...options,
  };
}

export function phoneField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"text", string> {
  return {
    __kenstackField: true,
    kind: "text",
    component: PhoneFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: phone,
    ...options,
  };
}

export function textareaField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"textarea", string> {
  return {
    __kenstackField: true,
    kind: "textarea",
    component: TextareaFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: z.string(),
    ...options,
  };
}

export function markdownField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"markdown", string> {
  return {
    __kenstackField: true,
    kind: "markdown",
    component: TextareaFieldComponent,
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
  };
}

export function booleanField(
  options: CommonFieldOptions<boolean> = {},
): FieldOptionOfKind<"boolean", boolean> {
  return {
    __kenstackField: true,
    kind: "boolean",
    component: CheckboxFieldComponent,
    default: false,
    searchable: false,
    revisions: true,
    zod: z.boolean(),
    ...options,
  };
}

export function slugField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"text", string> {
  return {
    __kenstackField: true,
    kind: "text",
    component: SlugFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: z.string().min(1, "Slug is required"),
    ...options,
  };
}

export function radioButtonField<const TOptions extends RadioButtonFieldOptions>(
  options: TOptions,
): FieldOptionOfKind<"radio-button", string, TOptions> {
  const defaultValue = options.default ?? "";

  return {
    __kenstackField: true,
    kind: "radio-button",
    component: RadioButtonFieldComponent,
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
  };
}

export function dateTimeField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"datetime", string> {
  return {
    __kenstackField: true,
    kind: "datetime",
    component: DateTimeFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: dateTimeSchema,
    ...options,
  };
}

export function dateField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"date", string> {
  return {
    __kenstackField: true,
    kind: "date",
    component: DateFieldComponent,
    default: "",
    searchable: false,
    revisions: true,
    zod: dateSchema,
    ...options,
  };
}

export function checkboxListField({
  default: defaultValue = [],
  filter = true,
  ...options
}: CheckboxListFieldOptions): FieldOptionOfKind<"checkbox-list", string[]> {
  return {
    __kenstackField: true,
    kind: "checkbox-list",
    component: CheckboxListFieldComponent,
    default: defaultValue,
    filter,
    searchable: false,
    revisions: true,
    zod: z.array(z.enum(options.options.map(({ value }) => value))),
    ...options,
  };
}

export function imageField<
  const TOptions extends ImageFieldOptions = Record<never, never>,
>(
  options: TOptions = {} as TOptions,
): FieldOptionOfKind<"image", null, TOptions> {
  return {
    __kenstackField: true,
    kind: "image",
    component: ImageFieldComponent,
    default: null,
    searchable: false,
    revisions: true,
    zod: imageSchema,
    ...options,
  };
}

export function mediaListField(): FieldOptionOfKind<"media-list", []> {
  return {
    __kenstackField: true,
    kind: "media-list",
    component: MediaListFieldComponent,
    default: [],
    searchable: false,
    revisions: true,
    zod: mediaListSchema,
  };
}

export function tagField(
  options: TagFieldOptions = {},
): FieldOptionOfKind<"tags", []> {
  return {
    __kenstackField: true,
    kind: "tags",
    component: TagFieldComponent,
    default: [],
    searchable: false,
    revisions: true,
    zod: tagsSchema,
    ...options,
  };
}

export function relationshipField(
  options: RelationshipFieldOptions = {},
): FieldOptionOfKind<"relationship", []> {
  return {
    __kenstackField: true,
    kind: "relationship",
    component: RelationshipFieldComponent,
    default: [],
    searchable: false,
    revisions: true,
    zod: relationshipSchema,
    ...options,
  };
}
