"use client";

import type { FC, PropsWithChildren, ReactNode } from "react";
import type { SelectedMedia } from "@kenstack/db/tables";
import { createZodSchema } from "@kenstack/fields/createZodSchema";
import type { DefinedFields } from "@kenstack/fields/types";
import type { OneToOneFieldSetsFrom } from "@kenstack/fields/oneToOneFieldSets";

export type OneToOneEditFormProps = {
  ParentEditForm: FC<PropsWithChildren>;
};

export type BaseListItem = {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type ListItemRow<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = BaseListItem & TExtra & { path: string };

type ListItemRender<TRow extends ListItemRow> = {
  render(row: TRow, context: { grouped: boolean }): ReactNode;
}["render"];

type ListItem<TRow extends ListItemRow> = readonly [
  render: ListItemRender<TRow>,
  options?: {
    className?: string;
    column?: string;
    mobileColumn?: string;
  },
];

type ListItems<TFields extends DefinedFields> = readonly ListItem<
  BaseListItem & {
    -readonly [
      TKey in keyof TFields as TFields[TKey] extends {
        list: infer TList;
      }
        ? TList extends false | undefined
          ? never
          : TKey
        : never
    ]: TFields[TKey]["kind"] extends "image"
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
  } & (keyof OneToOneFieldSetsFrom<TAdminFields> extends never
    ? { oneToOne?: never }
    : {
        oneToOne: {
          [
            TKey in keyof OneToOneFieldSetsFrom<TAdminFields>
          ]: FC<OneToOneEditFormProps>;
        };
      });
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

// The registry boundary must allow modules with different relation keys.
// defineClient's generic return type narrows those keys to one module.
export type AdminClient = Omit<
  NonNullable<ReturnType<typeof defineClient>["admin"]>,
  "oneToOne"
> & {
  oneToOne?: Record<string, FC<OneToOneEditFormProps>>;
};
export type ClientConfig = Omit<ReturnType<typeof defineClient>, "admin"> & {
  admin: AdminClient | undefined;
};
export type SettingsClient = NonNullable<ClientConfig["settings"]>;
