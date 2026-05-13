export * from "./fields";
export * from "./table";
import { defineRelationships, type Relationships } from "./relationships";

import type { MetaTable } from "./table";

import {
  createDefaultValues,
  createZodSchema,
  type DefinedFields,
} from "./fields";

import type { ComponentType, SVGProps } from "react";
import * as z from "zod";
import { type PipelineOptions } from "@kenstack/lib/api";
import { type AdminClient, adminClient } from "./client";
export { type AdminClient, adminClient };

import { type TagsTable } from "@kenstack/db/tables/tags";
import type {
  AnyColumn,
  InferSelectModel,
  SQL,
  InferInsertModel,
  // Table,
} from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

type OrderBy = SQL; // | AnyColumn;

type SelectValue = AnyColumn | SQL | SQL.Aliased;
type SelectShape = Record<string, SelectValue>;

export type ImageGalleryConfig = {
  table: AnyPgTable;
  tableIdKey: string;
  tableId: AnyPgColumn<{ data: number }>;
  imageIdKey: string;
  imageId: AnyPgColumn<{ data: number }>;
  sortOrderKey: string;
  sortOrder: AnyPgColumn<{ data: number }>;
};

// type FieldProps = {
//   transformations?: Record<string, string>; // cloudinary transformations
//   accept?: string[]; // array of mime types allowd to upload
//   folder?: string; // folder to upload to
// };

type Filters = {
  schema: z.ZodObject;
  defaultValues: Record<string, unknown>;
  Filters: React.FC /*<{
    state: Record<string, unknown>;
    setState: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  }>*/;
};

type MetaKeys = keyof MetaTable;

type AdminDefaultValues<TTable extends MetaTable> = Omit<
  InferInsertModel<TTable>,
  MetaKeys
>;

export type PreviewPath = `/${string}`;

export type AdminTable<
  TTable extends MetaTable,
  TListSelect extends SelectShape | undefined = undefined,
> = {
  client: AdminClient;
  /** Human‑readable name */
  title: string;
  /** SVG icon component (e.g. Lucide icons) */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;

  table: TTable;
  schema?: z.ZodObject;
  defaultValues?: AdminDefaultValues<TTable>;
  revalidate?: (string | ((row: InferSelectModel<TTable>) => string))[];

  fields: DefinedFields;
  filters?: Omit<Filters, "Filters">;

  preview?: PreviewPath;

  limit?: number;
  orderBy?: OrderBy[];
  select: TListSelect;
  relationships?: Relationships;
  galleries?: Record<string, ImageGalleryConfig>;
  tags?: {
    table: TagsTable;
  };
};

export type AnyAdminTable = AdminTable<MetaTable, SelectShape | undefined> & {
  schema: z.ZodObject;
};

export type AdminApiOptions = PipelineOptions & {
  adminTable: AnyAdminTable;
};

export function adminTable<
  TTable extends MetaTable,
  TListSelect extends SelectShape | undefined = undefined,
>(options: AdminTable<TTable, TListSelect>) {
  return {
    ...options,
    schema: createZodSchema(options.fields, true),
    defaultValues: createDefaultValues(options.fields),
  };
}

export type AdminConfig = [string, AnyAdminTable][];

export function adminConfig<TConfig extends AdminConfig>(adminConfig: TConfig) {
  return adminConfig;
}

export { defineRelationships };
