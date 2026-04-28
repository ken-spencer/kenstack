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

export type ListItemProps<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = {
  path: string;
  item: BaseListItem & TExtra;
};

export type ListItemComponent<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = React.FC<ListItemProps<TExtra>>;

import type { FetchResult } from "@kenstack/lib/fetcher";

export type AdminListResult<
  TItem extends Record<string, unknown> | never = never,
> = FetchResult<{
  total: number;
  items: [TItem] extends [never] ? BaseListItem[] : (BaseListItem & TItem)[];
}>;

export type AdminClientProps = {
  /** SVG icon component (e.g. Lucide icons) */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  schema?: z.ZodObject;
  fields: FieldOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ListItem: ListItemComponent<any>;
  EditForm: React.FC;
};

export type AdminClient = ReturnType<typeof adminClient>;

export function adminClient(options: AdminClientProps) {
  return {
    ...options,
    schema: createZodSchema(options.fields),
    // defaultValues: createDefaultValues(options.fields),
  };
}
