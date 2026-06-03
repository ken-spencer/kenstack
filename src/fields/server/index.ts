import type { User } from "@kenstack/types";
import type { deps } from "@app/deps";
import type * as z from "zod";
import { type SQL, type getTableColumns } from "drizzle-orm";
import type { AnyPgColumn, AnyPgTable } from "drizzle-orm/pg-core";

import type { DefinedField, DefinedFields, FieldDisplay } from "../types";
import type { TagsTable } from "@kenstack/db/tables/tags";
import type { Relationship } from "../relationships";
import { booleanField } from "./boolean";
import { checkboxListField } from "./checkboxList";
import { dateField } from "./date";
import { dateTimeField } from "./dateTime";
import { imageField } from "./image";
import { textField } from "./text";
export { booleanField } from "./boolean";
export { checkboxListField } from "./checkboxList";
export { dateField } from "./date";
export { dateTimeField } from "./dateTime";
export { imageField } from "./image";
export { mediaListField } from "./mediaList";
export { relationshipField, isRelationshipField } from "./relationship";
export { tagField, isTagField } from "./tags";
export { textField } from "./text";

type TransactionDb = Parameters<
  Parameters<(typeof deps)["db"]["transaction"]>[0]
>[0];
type TableColumns = ReturnType<typeof getTableColumns<AnyPgTable>>;
type SelectValue = TableColumns[string] | SQL;
export type FieldAfterSave = (tx: TransactionDb) => Promise<unknown>;
type FieldSaveTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
};

type FieldFilterOption = {
  description?: string;
  label: string;
  value: string;
};

export type FieldLoadContext = {
  db: Pick<typeof deps.db, "select">;
  key: string;
  tableId: number;
};

export type FieldSaveContext = {
  db: TransactionDb;
  key: string;
  tableId: number;
  value: unknown;
  values: Record<string, unknown>;
  user: User;
};

export type FieldDeleteContext = {
  db: typeof deps.db;
  key: string;
  tableId: number;
  row: Record<string, unknown>;
};

export type FieldListSelectContext = {
  key: string;
  field: ServerField;
  column: TableColumns[string] | undefined;
  columns: TableColumns;
};

export type FieldPreSaveContext = {
  db: TransactionDb;
  key: string;
  column: TableColumns[string] | undefined;
  value: unknown;
  values: Record<string, unknown>;
  id?: number | null;
  user: User;
  table: FieldSaveTable;
  shouldSaveField: (key: string) => boolean;
};

export type FieldPreSaveResult =
  | {
      status: "success";
      value?: unknown;
      remove?: boolean;
      afterSave?: FieldAfterSave[];
    }
  | {
      status: "error";
      message: string;
    };

export type FieldFilterConfig =
  | {
      kind: "date-range" | "boolean" | "text";
    }
  | {
      kind: "enum" | "includes";
      options: readonly FieldFilterOption[];
    };

export type FieldBehavior = {
  load?: (ctx: FieldLoadContext) => Promise<unknown>;
  save?: (ctx: FieldSaveContext) => Promise<unknown>;
  delete?: (ctx: FieldDeleteContext) => Promise<void>;
  upload?: true;
  tagRelations?: TagsTable;
  relationship?: Relationship;
  listSelect?: (ctx: FieldListSelectContext) => SelectValue | undefined;
  select?: (ctx: FieldListSelectContext) => SelectValue | undefined;
  filter?: FieldFilterConfig;
  display?: FieldDisplay;
  preSave?: (ctx: FieldPreSaveContext) => Promise<FieldPreSaveResult>;
};

export type ServerFieldDefaults = {
  zod?: z.ZodType;
  behavior?: FieldBehavior;
};

export type ServerFieldResolver<TField extends DefinedField = DefinedField> = (
  field: TField,
) => ServerFieldDefaults;

export type ServerField = DefinedField & {
  behavior?: FieldBehavior;
};

export type ServerDefinedFields = Record<string, ServerField>;
export type ServerDefinedFieldsFrom<TFields extends DefinedFields> = {
  [TKey in keyof TFields]: ServerField & TFields[TKey];
};

type ServerFieldPatches<TFields extends DefinedFields> = {
  [TKey in keyof TFields]?: ServerFieldResolver<TFields[TKey]>;
};

export function serverFields<const TFields extends DefinedFields>(
  fields: TFields,
  patches: ServerFieldPatches<TFields> = {},
) {
  const next = resolveServerFields(fields) as ServerDefinedFields;

  Object.entries(patches).forEach(([key, patch]) => {
    if (!patch) {
      return;
    }

    if (!(key in fields)) {
      throw new Error(`Cannot patch unknown field "${key}".`);
    }

    const field = next[key];

    const { zod, behavior } = patch(fields[key]);

    next[key] = {
      ...field,
      ...(zod ? { zod } : {}),
      behavior: {
        ...(field.behavior ?? {}),
        ...behavior,
      },
    };
  });

  return next as ServerDefinedFieldsFrom<TFields>;
}

export function resolveServerFields<const TFields extends DefinedFields>(
  fields: TFields,
): ServerDefinedFieldsFrom<TFields>;
export function resolveServerFields(fields: DefinedFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      const defaults = getDefaultServerField(field);
      const isServerField = "behavior" in field;
      const behavior =
        isServerField && field.behavior && typeof field.behavior === "object"
          ? field.behavior
          : {};
      return [
        key,
        {
          ...field,
          ...(!isServerField && "zod" in defaults ? { zod: defaults.zod } : {}),
          behavior: {
            ...defaults.behavior,
            ...behavior,
          },
        },
      ];
    }),
  );
}

function getDefaultServerField(field: DefinedField): ServerFieldDefaults {
  if (field.kind === "image") {
    return imageField()(field);
  }

  if (field.kind === "datetime") {
    return dateTimeField();
  }

  if (field.kind === "date") {
    return dateField();
  }

  if (field.kind === "boolean") {
    return booleanField();
  }

  if (field.kind === "checkbox-list") {
    return checkboxListField(field);
  }

  if (
    field.kind === "text" ||
    field.kind === "email" ||
    field.kind === "radio-button"
  ) {
    return textField();
  }

  return {};
}
