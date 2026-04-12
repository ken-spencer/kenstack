import type { ComponentType, SVGProps } from "react";
import * as z from "zod";
import {
  // createDefaultValues,
  createZodSchema,
  type FieldOptions,
} from "./fields";

export type BaseListItem = {
  id: number;
  createdAt: string;
  updatedAt: string;
};
import type { FetchResult } from "@kenstack/lib/fetcher";

export type AdminListResult<
  TItem extends Record<string, unknown> | never = never,
> = FetchResult<{
  total: number;
  items: [TItem] extends [never] ? BaseListItem[] : (BaseListItem & TItem)[];
}>;

export type AdminClient = {
  /** SVG icon component (e.g. Lucide icons) */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  schema?: z.ZodObject;
  fields: FieldOptions;
  ListItem: React.FC<{ path: string; item: Record<string, unknown> }>;
  EditForm: React.FC;
};

export function adminClient(options: AdminClient) {
  return {
    schema: createZodSchema(options.fields),
    // defaultValues: createDefaultValues(options.fields),
    ...options,
  };
}
