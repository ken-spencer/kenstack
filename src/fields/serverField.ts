/*
 * Defines the server half of an isomorphic field.
 *
 * serverField(...) pairs a configurable resolver with its configured
 * isomorphic field. defineServerField(...) builds the same resolver shape from
 * fixed server behavior plus optional per-use overrides. The registration brand
 * keeps resolver entries distinct from plain server behavior in public types.
 */
import type * as z from "zod";
import { type SQL, type getTableColumns } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";

import type { User } from "@kenstack/types";
import type {
  Database,
  DbTransaction,
  NumericIdTable,
} from "@kenstack/db/types";
import type { TagsTable } from "@kenstack/db/tables/tags";
import type { FieldDefinition, FieldFactory, FieldOption } from "./field";
import type { DefinedField, DefinedFields } from "@kenstack/admin/fields";
import type { Relationship } from "./relationship/relationships";

type TableColumns = ReturnType<typeof getTableColumns<AnyPgTable>>;
type SelectValue = TableColumns[string] | SQL;

export type ServerField<TValue = unknown> = {
  zod?: z.ZodType<TValue>;
  load?: (context: FieldLoadContext) => Promise<unknown>;
  save?: (context: FieldSaveContext<TValue>) => Promise<unknown>;
  delete?: (context: FieldDeleteContext) => Promise<void>;
  upload?: FieldUploadBehavior;
  tagRelations?: TagsTable;
  relationship?: Relationship;
  listSelect?: (context: FieldListSelectContext) => SelectValue | undefined;
  select?: (context: FieldListSelectContext) => SelectValue | undefined;
  preSave?: (
    context: FieldPreSaveContext<TValue>,
  ) => Promise<FieldPreSaveResult>;
  prepareSave?: (
    context: FieldPrepareSaveContext<TValue>,
  ) => Promise<FieldPrepareSaveResult>;
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
  field: DefinedFields[string] & ServerField;
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

export type FieldAfterSave = (tx: DbTransaction) => Promise<unknown>;
export type FieldSaveTask = () => Promise<unknown> | unknown;

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

type RegistrableIsomorphicField = FieldOption | DefinedField;

type FieldImplementationFrom<TField extends RegistrableIsomorphicField> = Omit<
  DefinedFields[string],
  "kind" | "zod" | "default"
> & {
  zod: TField["zod"];
  default: TField["default"];
} & Omit<
    Omit<TField, "__kenstackField" | "searchable" | "revisions"> & {
      searchable: boolean;
      revisions: boolean;
    },
    keyof DefinedFields[string]
  > & {
    kind: TField["kind"];
  };

declare const serverFieldRegistration: unique symbol;

export type ServerFieldRegistration = ((field: never) => object) & {
  readonly kind: string;
  readonly [serverFieldRegistration]: true;
};

export type ServerFieldResolver<
  TField extends DefinedFields[string] = DefinedFields[string],
  TServerField extends object = object,
> = ((field: TField) => TServerField) & {
  readonly kind: TField["kind"];
  readonly [serverFieldRegistration]: true;
};

export type ServerFieldResolverFor<
  TIsomorphicField extends RegistrableIsomorphicField,
  TServerField extends ServerField<z.output<TIsomorphicField["zod"]>> =
    ServerField<z.output<TIsomorphicField["zod"]>>,
> = ServerFieldResolver<
  FieldImplementationFrom<TIsomorphicField>,
  TServerField
>;

export type SelectedServerFieldResolverFor<
  TIsomorphicField extends RegistrableIsomorphicField,
  TSelection extends SQL,
> = ServerFieldResolverFor<
  TIsomorphicField,
  ServerField<z.output<TIsomorphicField["zod"]>> & {
    listSelect: (context: FieldListSelectContext) => TSelection | undefined;
    select: (context: FieldListSelectContext) => TSelection | undefined;
  }
>;

type ServerFieldFactory<TField extends FieldDefinition, TValue> = (
  options?: Omit<ServerField<TValue>, "zod"> & { kind?: never },
) => ServerFieldResolver<DefinedField<TField["kind"]>, ServerField<TValue>>;

export function serverField<
  const TIsomorphicField extends RegistrableIsomorphicField,
  const TServerField extends ServerField<z.output<TIsomorphicField["zod"]>>,
>(
  isomorphicField: TIsomorphicField,
  resolver: (
    field: FieldImplementationFrom<TIsomorphicField>,
  ) => TServerField & ServerField<z.output<TIsomorphicField["zod"]>>,
): ServerFieldResolverFor<TIsomorphicField, TServerField> {
  return Object.assign(resolver, {
    kind: isomorphicField.kind,
  }) as ServerFieldResolverFor<TIsomorphicField, TServerField>;
}

export function defineServerField<
  const TField extends FieldDefinition,
  const TServerField extends ServerField<z.output<TField["zod"]>>,
>(
  isomorphicField: FieldFactory<TField>,
  base: ServerField<z.output<TField["zod"]>> &
    TServerField & { zod?: never; kind?: never },
): ServerFieldFactory<TField, z.output<TField["zod"]>>;
export function defineServerField<
  const TField extends FieldDefinition,
  const TServerField extends { zod: z.ZodType },
>(
  isomorphicField: FieldFactory<TField>,
  base: ServerField<z.output<TServerField["zod"]>> &
    TServerField & { kind?: never },
): ServerFieldFactory<TField, z.output<TServerField["zod"]>>;
export function defineServerField(
  isomorphicField: () => FieldOption,
  base: ServerField,
) {
  // defineField factories carry their fixed kind, while this implementation
  // signature remains broad enough to satisfy both public overloads.
  const kind = (isomorphicField as typeof isomorphicField & { kind: string })
    .kind;

  return ((options: object = {}) =>
    Object.assign(
      (field: DefinedField) => {
        const { zod, ...behavior } = {
          ...base,
          ...options,
        };

        return {
          ...behavior,
          ...(zod ? { zod: field.zod.pipe(zod) } : {}),
        };
      },
      { kind },
    )) as ServerFieldFactory<FieldDefinition, unknown>;
}
