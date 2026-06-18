"use client";

import type { FC, ReactNode } from "react";
import type { SelectedMedia } from "@kenstack/db/tables";
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

type ListItemRender<TRow extends ListItemRow> = {
  render(row: TRow): ReactNode;
}["render"];

type ListItem<TRow extends ListItemRow> = readonly [
  render: ListItemRender<TRow>,
  options?: {
    className?: string;
    column?: string;
    mobileColumn?: string;
  },
];

type ListItems<TFields extends DefinedFields = DefinedFields> =
  readonly ListItem<
    BaseListItem & {
      -readonly [TKey in keyof TFields as TFields[TKey] extends {
        list: infer TList;
      }
        ? TList extends false | undefined
          ? never
          : TKey
        : never]: TFields[TKey]["kind"] extends "image"
        ? SelectedMedia | null
        : TFields[TKey]["default"];
    } & { path: string }
  >[];

export function defineClient<
  const TAdminFields extends DefinedFields = DefinedFields,
  const TSettingsFields extends DefinedFields = DefinedFields,
>({
  admin,
  settings,
}: {
  admin?: {
    fields: TAdminFields;
    listItems?: ListItems<TAdminFields>;
    EditForm: FC;
  };
  settings?: {
    fields: TSettingsFields;
  };
}) {
  return {
    admin: admin
      ? { ...admin, schema: createZodSchema(admin.fields) }
      : undefined,
    settings: settings
      ? { ...settings, schema: createZodSchema(settings.fields) }
      : undefined,
  };
}

export function defineSettingsClient<
  const TSettingsFields extends DefinedFields = DefinedFields,
>({ fields }: { fields: TSettingsFields }) {
  return { fields, schema: createZodSchema(fields) };
}

export type AdminClient = NonNullable<ReturnType<typeof defineClient>["admin"]>;
export type ClientConfig = ReturnType<typeof defineClient>;
export type SettingsClient = NonNullable<
  ReturnType<typeof defineClient>["settings"]
>;
