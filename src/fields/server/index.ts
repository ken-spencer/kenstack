import "server-only";

import type { User } from "@kenstack/types";
import type * as z from "zod";
import { type SQL, type getTableColumns } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import type {
  Database,
  DbTransaction,
  NumericIdTable,
} from "@kenstack/db/types";

import type { DefinedField, DefinedFields, FieldDisplay } from "../types";
import { attachFieldSetRefinements } from "../fieldSetRefinements";
import {
  attachOneToOneFieldSets,
  getOneToOneFieldSets,
  type FieldsWithOneToOne,
  type OneToOneFieldSetsFrom,
} from "../oneToOneFieldSets";
import type { TagsTable } from "@kenstack/db/tables/tags";
import type { Relationship } from "../relationships";
import { booleanField } from "./boolean";
import { checkboxListField } from "./checkboxList";
import { dateField } from "./date";
import { dateTimeField } from "./dateTime";
import { fileField } from "./file";
import { imageField } from "./image";
import { radioButtonField } from "./radioButton";
import { textField } from "./text";
export { booleanField } from "./boolean";
export { checkboxListField } from "./checkboxList";
export { dateField } from "./date";
export { dateTimeField } from "./dateTime";
export { fileField } from "./file";
export { imageField } from "./image";
export { mediaListField } from "./mediaList";
export { radioButtonField } from "./radioButton";
export { relationshipField, isRelationshipField } from "./relationship";
export { tagField, isTagField } from "./tags";
export { textField } from "./text";

type TableColumns = ReturnType<typeof getTableColumns<AnyPgTable>>;
type SelectValue = TableColumns[string] | SQL;
export type FieldAfterSave = (tx: DbTransaction) => Promise<unknown>;
export type FieldSaveTask = () => Promise<unknown> | unknown;

type FieldFilterOption = {
  description?: string;
  label: string;
  value: string;
};

export type FieldLoadContext = {
  db: Pick<Database, "select">;
  key: string;
  tableId: number;
};

export type FieldSaveContext<TValue = unknown> = {
  admin?: boolean;
  db: DbTransaction;
  key: string;
  tableId: number;
  value: TValue;
  values: Record<string, unknown>;
  user: User;
};

export type FieldDeleteContext = {
  db: Database;
  key: string;
  tableId: number;
  row: Record<string, unknown>;
};

export type FieldListSelectContext = {
  key: string;
  field: ResolvedServerField;
  column: TableColumns[string] | undefined;
  columns: TableColumns;
};

export type FieldPreSaveContext<TValue = unknown> = {
  admin: boolean;
  db: DbTransaction;
  key: string;
  column: TableColumns[string] | undefined;
  value: TValue;
  values: Record<string, unknown>;
  id?: number | null;
  user: User;
  table: NumericIdTable;
  shouldSaveField: (key: string) => boolean;
};

export type FieldPrepareSaveContext<TValue = unknown> = Omit<
  FieldPreSaveContext<TValue>,
  "db"
> & {
  db: Database;
};

export type FieldPrepareSaveResult =
  | {
      status: "success";
      value?: unknown;
      savedValue?: unknown;
      afterSave?: FieldAfterSave[];
      afterCommit?: FieldSaveTask[];
      afterFailure?: FieldSaveTask[];
    }
  | {
      status: "error";
      message: string;
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

export type FieldUploadOptions = {
  accept?: readonly string[];
  maxSize?: number;
  maxSizeMessage?: string;
};

export type FieldUploadBehavior = true | FieldUploadOptions;

export type FieldFilterConfig =
  | {
      field?: SelectValue;
      kind: "date-range" | "boolean" | "text";
    }
  | {
      field?: SelectValue;
      kind: "enum" | "includes";
      options: readonly FieldFilterOption[];
    };

export type FieldBehavior<TValue = unknown> = {
  load?: (ctx: FieldLoadContext) => Promise<unknown>;
  save?: (ctx: FieldSaveContext<TValue>) => Promise<unknown>;
  delete?: (ctx: FieldDeleteContext) => Promise<void>;
  upload?: FieldUploadBehavior;
  tagRelations?: TagsTable;
  relationship?: Relationship;
  listSelect?: (ctx: FieldListSelectContext) => SelectValue | undefined;
  select?: (ctx: FieldListSelectContext) => SelectValue | undefined;
  filterConfig?: FieldFilterConfig;
  display?: FieldDisplay;
  preSave?: (ctx: FieldPreSaveContext<TValue>) => Promise<FieldPreSaveResult>;
  prepareSave?: (
    ctx: FieldPrepareSaveContext<TValue>,
  ) => Promise<FieldPrepareSaveResult>;
};

export type ServerField<TValue = unknown> =
  | (FieldBehavior<TValue> & { zod?: never })
  | (Omit<FieldBehavior, "save" | "preSave" | "prepareSave"> & {
      zod: z.ZodType;
      save?: never;
      preSave?: never;
      prepareSave?: never;
    });

export type ServerFieldResolver<
  TField extends DefinedField = DefinedField,
  TValue = z.output<TField["zod"]>,
> = (field: TField) => ServerField<TValue>;

type ResolvedServerField = DefinedField & FieldBehavior;

export type ServerDefinedFields = Record<string, ResolvedServerField>;
export type ServerDefinedFieldsFrom<TFields extends DefinedFields> =
  FieldsWithOneToOne<
    {
      [TKey in keyof TFields]: ResolvedServerField & TFields[TKey];
    },
    OneToOneFieldSetsFrom<TFields>
  >;

export type ServerBehaviors<TFields extends DefinedFields> = {
  [TKey in keyof TFields]?:
    | ServerField<z.output<TFields[TKey]["zod"]>>
    | ServerFieldResolver<TFields[TKey]>;
};

const resolvedServerFieldSets = new WeakSet<object>();

export function serverFields<const TFields extends DefinedFields>(
  fields: TFields,
  behaviors: ServerBehaviors<TFields> = {},
) {
  const next = resolveServerFields(fields) as ServerDefinedFields;

  Object.entries(behaviors).forEach(([key, behavior]) => {
    if (!behavior) {
      return;
    }

    if (!(key in fields)) {
      throw new Error(`Cannot configure unknown field "${key}".`);
    }

    const field = next[key];

    const serverField =
      typeof behavior === "function" ? behavior(fields[key]) : behavior;
    const { zod, ...serverBehavior } = serverField;

    next[key] = {
      ...field,
      ...serverBehavior,
      ...(zod ? { zod } : {}),
    };
  });

  return next as ServerDefinedFieldsFrom<TFields>;
}

export function resolveServerFields<const TFields extends DefinedFields>(
  fields: TFields,
): ServerDefinedFieldsFrom<TFields>;
export function resolveServerFields(fields: DefinedFields) {
  if (resolvedServerFieldSets.has(fields)) {
    return fields;
  }

  const resolvedFields = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => {
      return [
        key,
        {
          ...field,
          ...getDefaultServerField(field),
        },
      ];
    }),
  );

  const resolved = attachOneToOneFieldSets(
    attachFieldSetRefinements(resolvedFields, { from: fields }),
    getOneToOneFieldSets(fields),
  );
  resolvedServerFieldSets.add(resolved);
  return resolved;
}

function getDefaultServerField(field: DefinedField) {
  if (field.kind === "file") {
    return fileField()(field);
  }

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

  if (field.kind === "radio-button") {
    return radioButtonField(field);
  }

  if (field.kind === "select") {
    return radioButtonField(field);
  }

  if (field.kind === "text" || field.kind === "email") {
    return textField();
  }

  return {};
}
