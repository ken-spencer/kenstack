export * from "./fields";
export * from "./table";
import type { MetaTable } from "./table";

import {
  createDefaultValues,
  createZodSchema,
  type FieldOptions,
} from "./fields";

import type { ComponentType, SVGProps } from "react";
import * as z from "zod";
import { type PipelineOptions } from "@kenstack/lib/api";
import { type AdminClient, adminClient } from "./client";
export { type AdminClient, adminClient };

import type {
  AnyColumn,
  InferSelectModel,
  SQL,
  InferInsertModel,
  Table,
} from "drizzle-orm";

type OrderBy = SQL; // | AnyColumn;

type SelectValue = AnyColumn | SQL | SQL.Aliased;
type SelectShape = Record<string, SelectValue>;

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

type AdminDefaultValues<TTable extends MetaTable & Table> = Omit<
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

  fields: FieldOptions;
  filters?: Omit<Filters, "Filters">;

  preview?: PreviewPath;

  limit?: number;
  orderBy?: OrderBy[];
  select: TListSelect;
};

export type AnyAdminTable = AdminTable<MetaTable, SelectShape | undefined>;

export type AdminApiOptions = PipelineOptions & {
  adminTable: AnyAdminTable;
};

export function adminTable<
  TTable extends MetaTable,
  TListSelect extends SelectShape | undefined = undefined,
>(options: AdminTable<TTable, TListSelect>) {
  return {
    schema: createZodSchema(options.fields, true),
    defaultValues: createDefaultValues(options.fields),
    ...options,
  };
}

export type AdminConfig = [string, AnyAdminTable][];

export function adminConfig<TConfig extends AdminConfig>(adminConfig: TConfig) {
  return adminConfig;
}
