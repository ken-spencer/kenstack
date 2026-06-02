import type { ComponentType } from "react";
import type * as z from "zod";

export type FieldKind =
  | "text"
  | "number"
  | "email"
  | "textarea"
  | "markdown"
  | "boolean"
  | "date"
  | "datetime"
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

export type FieldRecordRefinement = (
  values: Record<string, unknown>,
  ctx: z.RefinementCtx,
) => void;

type FieldOptionMarker = {
  __kenstackField: true;
};

export type FieldInputOption = {
  description?: string;
  label: string;
  value: string;
};

export type FieldOption<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = FieldOptionMarker & {
  kind: TKind;
  zod: z.ZodType;
  default: TDefault;
  component?: FieldComponent;
  label?: string;
  description?: string;
  options?: readonly FieldInputOption[];
  recordRefinement?: FieldRecordRefinement;
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

type DefinedFieldBase<
  TKind extends FieldKind = FieldKind,
  TDefault = unknown,
> = {
  kind: TKind;
  zod: z.ZodType;
  default: TDefault;
  component?: FieldComponent;
  label?: string;
  description?: string;
  options?: readonly FieldInputOption[];
  recordRefinement?: FieldRecordRefinement;
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
