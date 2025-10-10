import type { ComponentType, SVGProps } from "react";
import type { /*PipelineSchema,*/ SchemaFactory } from "@kenstack/schemas";
import { type Document } from "mongodb";
import * as z from "zod";

type BaseList = {
  limit?: number;
  sort?: Record<string, -1 | 1>;
};
import type { FetchResult } from "@kenstack/lib/fetcher";

type BaseEdit = object;

type FieldProps = {
  transformations?: Record<string, string>; // cloudinary transformations
  accept?: string[]; // array of mime types allowd to upload
  folder?: string; // folder to upload to
};

type Filters = {
  schema: z.ZodObject;
  defaultValues: Record<string, unknown>;
  Filters: React.FC /*<{
    state: Record<string, unknown>;
    setState: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  }>*/;
};

export type AdminSharedConfig = {
  /** Human‑readable name */
  title: string;
  schema: SchemaFactory | z.ZodObject;
  defaultValues: Record<string, unknown>;

  fields?: Record<string, FieldProps>;
  filters?: Omit<Filters, "Filters">;
  preview?: (params: Record<string, unknown>) => `/${string}`;

  list?: BaseList;
  edit?: BaseEdit;
};

export type AdminServerOnlyConfig = {
  // schemaServer: ZodObject;
  /** MongoDB collection name */
  collection: string;
  /** Routes to revalidate with revalidatePath */
  revalidate?: (
    | `/${string}`
    | ((params: Record<string, unknown>) => `/${string}`)
  )[];
  /** Tags to revalidate with revalidateTag */
  revalidateTags?: string[];
  list: BaseList & {
    aggregate?: (options?: { data: Record<string, unknown> }) => Document[];
    select: Partial<Record<string, 1>>;
  };
  edit?: {
    aggregate?: (options?: {
      projection: Record<string, boolean>;
    }) => Document[];
  };
};

export type AdminServerConfig = AdminSharedConfig & AdminServerOnlyConfig;

export type AdminClientOnlyConfig = {
  /** SVG icon component (e.g. Lucide icons) */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  filters?: Pick<Filters, "Filters">;

  list: BaseList & {
    component: React.FC<{ path: string; item: Record<string, unknown> }>;
  };
  edit: BaseEdit & {
    component: React.FC;
  };
};

export type AdminClientConfig = AdminSharedConfig & AdminClientOnlyConfig;

// All config including each collection
export type ClientConfig = [
  string,
  AdminClientConfig,
  Partial<AdminClientConfig>?,
][];
export type ServerConfig = [
  string,
  AdminServerConfig,
  Partial<AdminServerConfig>?,
][];

type BaseItem = {
  id: string;
  meta: { createdAt: string; updatedAt: string };
};
export type AdminListResult<
  TItem extends Record<string, unknown> | never = never,
> = FetchResult<{
  total: number;
  items: [TItem] extends [never] ? BaseItem[] : (BaseItem & TItem)[];
}>;
