import type { FC, ReactNode } from "react";
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

type ListItem<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = readonly [
  render: (row: ListItemRow<TExtra>) => ReactNode,
  options?: {
    className?: string;
    column?: string;
  },
];

type ListItems<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = readonly ListItem<TExtra>[];

export function defineClient<
  TListItem extends Record<string, unknown> = Record<string, unknown>,
>({
  admin,
  settings,
}: {
  admin?: {
    fields: DefinedFields;
    listItems?: ListItems<TListItem>;
    EditForm: FC;
  };
  settings?: {
    fields: DefinedFields;
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

export type AdminClient = NonNullable<ReturnType<typeof defineClient>["admin"]>;
export type ClientConfig = ReturnType<typeof defineClient>;
export type SettingsClient = NonNullable<
  ReturnType<typeof defineClient>["settings"]
>;
