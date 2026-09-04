"use client";

/*
 * Public entry point: the admin client-configuration API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import type { FC, PropsWithChildren, ReactNode } from "react";
import type * as z from "zod";
import type { ZodObject } from "zod";
import type { SelectedImage, SelectedMedia } from "@kenstack/db/queries";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import type { DefinedField, DefinedFields } from "@kenstack/admin/fields";
import {
  type ResolvedOneToOneDefinition,
  resolveOneToOneDefinition,
  withOneToOneSelectionField,
} from "@kenstack/admin/internal/oneToOne";

// Public API: consumed by host sites.
export type OneToOneEditFormProps<
  TFields extends DefinedFields = DefinedFields,
> = {
  ParentEditForm: FC<PropsWithChildren>;
  fields: TFields;
  prefix: string;
};

// ClientConfig stores relation forms with different field maps in one runtime
// registry, so the erased boundary must remain bivariant like list renderers.
type OneToOneEditForm<TFields extends DefinedFields = DefinedFields> = {
  bivarianceHack(props: OneToOneEditFormProps<TFields>): ReturnType<FC>;
}["bivarianceHack"];

type ClientOneToOneDefinition<TFields extends DefinedFields = DefinedFields> = {
  EditForm: OneToOneEditForm<TFields>;
  fields: TFields;
};

type ClientOneToOneConfig = Record<string, ClientOneToOneDefinition>;

export type ClientOneToOne = {
  field: ResolvedOneToOneDefinition["field"];
  relations: Record<
    string,
    {
      defaultValues: Record<string, unknown>;
      EditForm: OneToOneEditForm;
      fields: DefinedFields;
      title: string;
      value: string;
    }
  >;
  selectionField: ResolvedOneToOneDefinition["selectionField"];
};

export function defineOneToOneClient<const TFields extends DefinedFields>(
  options: ClientOneToOneDefinition<TFields>,
): ClientOneToOneDefinition<TFields> {
  return options;
}

function resolveOneToOne(config: ClientOneToOneConfig): ClientOneToOne {
  const definition = resolveOneToOneDefinition(
    Object.fromEntries(
      Object.entries(config).map(([name, relation]) => [name, relation.fields]),
    ),
  );

  return {
    field: definition.field,
    relations: Object.fromEntries(
      Object.entries(config).map(([name, relationConfig]) => {
        const relation = definition.relations[name];
        if (!relation) {
          throw new Error(`Missing one-to-one definition "${name}".`);
        }
        return [name, { ...relation, EditForm: relationConfig.EditForm }];
      }),
    ),
    selectionField: definition.selectionField,
  };
}

export type BaseListItem = {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type ListItemRow<
  TExtra extends Record<string, unknown> = Record<string, unknown>,
> = BaseListItem & TExtra & { path: string };

// ClientConfig stores modules with different row shapes in one registry, so
// render callbacks must remain bivariant at that shared boundary.
type ListItemRender<TRow extends ListItemRow> = {
  bivarianceHack(row: TRow, context: { grouped: boolean }): ReactNode;
}["bivarianceHack"];

type ListItem<TRow extends ListItemRow> = readonly [
  render: ListItemRender<TRow>,
  options?: {
    className?: string;
    column?: string;
    mobileColumn?: string;
  },
];

type ListFieldValue<TField extends DefinedField> =
  TField["kind"] extends "image"
    ? SelectedImage | null
    : TField["kind"] extends "file"
      ? SelectedMedia | null
      : z.output<TField["zod"]>;

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
    ]: ListFieldValue<TFields[TKey]>;
  } & { path: string }
>[];

type BareFieldDefinitions<TFields extends DefinedFields> = {
  [TKey in keyof TFields]: "component" extends keyof TFields[TKey]
    ? never
    : unknown;
};

export function defineClient<
  const TFields extends DefinedFields = DefinedFields,
  const TSettingsFields extends DefinedFields = DefinedFields,
>({
  admin,
  settings,
}: {
  admin?: {
    fields: TFields & BareFieldDefinitions<TFields>;
    listItems?: ListItems<TFields>;
    EditForm: FC<PropsWithChildren>;
    oneToOne?: ClientOneToOneConfig;
  };
  settings?: {
    fields: TSettingsFields & BareFieldDefinitions<TSettingsFields>;
    SettingsForm: FC;
  };
}) {
  return {
    admin: admin
      ? (() => {
          const oneToOne = admin.oneToOne
            ? resolveOneToOne(admin.oneToOne)
            : undefined;
          const fields = oneToOne
            ? withOneToOneSelectionField(admin.fields, oneToOne)
            : admin.fields;
          return {
            fields,
            listItems: admin.listItems,
            EditForm: admin.EditForm,
            oneToOne,
          };
        })()
      : undefined,
    settings: settings
      ? { ...settings, schema: createSchemaFromFields(settings.fields) }
      : undefined,
  };
}

// The registry boundary must allow modules with different relation keys.
// defineClient's generic return type narrows those keys to one module.
export type AdminClient = {
  fields: DefinedFields;
  listItems?: ListItems<DefinedFields>;
  EditForm: FC<PropsWithChildren>;
  oneToOne?: ClientOneToOne;
};
export type SettingsClient = {
  fields: DefinedFields;
  SettingsForm: FC;
  schema: ZodObject;
};
export type ClientConfig = {
  admin: AdminClient | undefined;
  settings: SettingsClient | undefined;
};
