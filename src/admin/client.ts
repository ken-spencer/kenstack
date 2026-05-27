import type { FC, ReactNode } from "react";
import * as z from "zod";
import type { FetchResult } from "@kenstack/api/fetcher";
import { createZodSchema } from "@kenstack/fields/createZodSchema";
import type { DefinedFields } from "@kenstack/fields/types";

export type BaseListItem = {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type ListItemRow<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = BaseListItem & TExtra & { path: string };

export type ListItemOptions = {
  className?: string;
  column?: string;
};

export type ListItemRenderer<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = (row: ListItemRow<TExtra>) => ReactNode;

export type ListItem<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = readonly [render: ListItemRenderer<TExtra>, options?: ListItemOptions];

export type ListItems<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = readonly ListItem<TExtra>[];

export type AdminListResult<
  TItem extends Record<string, unknown> | never = never,
> = FetchResult<{
  total: number;
  items: [TItem] extends [never] ? BaseListItem[] : (BaseListItem & TItem)[];
}>;

export type AdminClientProps<
  TListItem extends Record<string, unknown> = Record<string, unknown>,
> = {
  fields: DefinedFields;
  listItems?: ListItems<TListItem>;
  EditForm: FC;
};

export type AdminClient<
  TListItem extends Record<string, unknown> = Record<string, unknown>,
> = AdminClientProps<TListItem> & {
  schema: z.ZodObject;
};

export type SettingsClientProps = {
  fields: DefinedFields;
};

export type SettingsClient = SettingsClientProps & {
  schema: z.ZodObject;
};

export type ModuleClientProps<
  TListItem extends Record<string, unknown> = Record<string, unknown>,
> =
  | (AdminClientProps<TListItem> & {
      settings?: SettingsClientProps | SettingsClient;
    })
  | {
      settings: SettingsClientProps | SettingsClient;
    };

export type ModuleClient = Partial<AdminClient> & {
  settings?: SettingsClient;
};

export function defineClient<
  TListItem extends Record<string, unknown> = Record<string, unknown>,
>(
  options: AdminClientProps<TListItem> & {
    settings?: SettingsClientProps | SettingsClient;
  },
): AdminClient<TListItem> & { settings?: SettingsClient };

export function defineClient(options: {
  settings: SettingsClientProps | SettingsClient;
}): ModuleClient;

export function defineClient({
  settings,
  ...options
}: ModuleClientProps): ModuleClient {
  return {
    ...options,
    schema:
      "fields" in options && "EditForm" in options
        ? createZodSchema(options.fields)
        : undefined,
    settings: settings
      ? { ...settings, schema: createZodSchema(settings.fields) }
      : undefined,
  };
}
