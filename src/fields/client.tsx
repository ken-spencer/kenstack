import * as z from "zod";

import { email } from "@kenstack/zod/email";
import { imageSchema } from "@kenstack/zod/image";
import { mediaSchema } from "@kenstack/zod/media";
import { tagsSchema } from "@kenstack/zod/tags";
import MediaField from "@kenstack/admin/forms/MediaField";
import AdminImageField from "@kenstack/admin/forms/ImageField";
import RelationshipField from "@kenstack/admin/forms/RelationshipField";
import TagField from "@kenstack/admin/forms/TagField";
import CheckboxField from "@kenstack/forms/CheckboxField";
import CheckboxList from "@kenstack/forms/CheckboxList";
import DateField from "@kenstack/forms/DateField";
import InputField from "@kenstack/forms/InputField";
import SlugField from "@kenstack/forms/SlugField";
import TextareaField from "@kenstack/forms/TextareaField";
import { relationshipSchema } from "./relationshipSchema";
import type { FieldComponentProps, FieldKind, FieldOption } from "./types";

type FieldOptionOfKind<TKind extends FieldKind, TDefault> = FieldOption<
  TKind,
  TDefault
>;

type CommonFieldOptions<TDefault = unknown> = {
  zod?: z.ZodType;
  default?: TDefault;
  label?: string;
  description?: string;
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
  options: readonly (readonly [
    value: string,
    label: string,
    description?: string,
  ])[];
  zod?: z.ZodType;
  default?: string[];
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

function TextFieldComponent(props: FieldComponentProps) {
  return <InputField {...props} />;
}

function EmailFieldComponent(props: FieldComponentProps) {
  return <InputField {...props} type="email" />;
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
      options={options?.map(([value, label]) => [value, label]) ?? []}
    />
  );
}

function DateTimeFieldComponent(props: FieldComponentProps) {
  return <DateField {...props} />;
}

function SlugFieldComponent(props: FieldComponentProps) {
  return <SlugField {...props} />;
}

function ImageFieldComponent(props: FieldComponentProps) {
  return <AdminImageField {...props} />;
}

function MediaFieldComponent(props: FieldComponentProps) {
  return <MediaField {...props} />;
}

function TagFieldComponent(props: FieldComponentProps) {
  return <TagField {...props} />;
}

function RelationshipFieldComponent(props: FieldComponentProps) {
  return <RelationshipField {...props} relationship={props.name} />;
}

export function textField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"text", string> {
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

export function emailField(
  options: CommonFieldOptions<string> = {},
): FieldOptionOfKind<"email", string> {
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
    zod: z.string().datetime({ precision: 3 }).or(z.literal("")),
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
    zod: z.array(z.enum(options.options.map(([value]) => value))),
    ...options,
  };
}

export function imageField(
  options: ImageFieldOptions = {},
): FieldOptionOfKind<"image", null> {
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

export function mediaField(): FieldOptionOfKind<"media", []> {
  return {
    __kenstackField: true,
    kind: "media",
    component: MediaFieldComponent,
    default: [],
    searchable: false,
    revisions: true,
    zod: mediaSchema,
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
