import type { ComponentType, SVGProps } from "react";
import type * as z from "zod";

export type FieldKind =
  | "text"
  | "number"
  | "email"
  | "textarea"
  | "markdown"
  | "custom"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "radio-button"
  | "checkbox-list"
  | "image"
  | "media-list"
  | "tags"
  | "relationship";

export type FieldDisplayContext<TField = DefinedField> = {
  key: string;
  field: TField;
  value: unknown;
  values: Record<string, unknown>;
};

export type FieldDisplay = (
  ctx: FieldDisplayContext,
) => Promise<unknown> | unknown;

type FieldOptionMarker = {
  __kenstackField: true;
};

export type FieldInputOption = {
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
};

export type MediaListUploadOptions = {
  accept?: readonly string[];
  uploadMaxSize?: number;
  uploadMaxSizeMessage?: string;
};

export type FieldOption<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = FieldOptionMarker & {
  kind: TKind;
  zod: z.ZodType;
  default: TDefault;
  component?: FieldComponentLoader;
  label?: string;
  description?: string;
  options?: readonly FieldInputOption[];
  searchable?: boolean;
  revisions?: boolean;
  list?: boolean | "square" | "original";
  filter?: boolean;
  sort?:
    | boolean
    | {
        defaultDirection?: "asc" | "desc";
      };
  display?: FieldDisplay;
};

export type FieldOptions = Record<string, FieldOption>;

export type FieldComponentProps = {
  name: string;
  label: string;
  description?: string;
  options?: readonly FieldInputOption[];
};

export type FieldComponent = ComponentType<FieldComponentProps>;
export type FieldComponentLoader = () => Promise<{
  default: FieldComponent;
}>;

type DefinedFieldBase<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = {
  kind: TKind;
  zod: z.ZodType;
  default: TDefault;
  component?: FieldComponentLoader;
  label?: string;
  description?: string;
  options?: readonly FieldInputOption[];
  searchable: boolean;
  revisions: boolean;
  list?: boolean | "square" | "original";
  filter?: boolean;
  sort?:
    | boolean
    | {
        defaultDirection?: "asc" | "desc";
      };
  display?: FieldDisplay;
};

export type DefinedField<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = TKind extends FieldKind ? DefinedFieldBase<TKind, TDefault> : never;

export type DefinedFields = Record<string, DefinedField>;
