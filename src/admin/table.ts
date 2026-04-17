import {
  getTableColumns,
  sql,
  type ColumnBaseConfig,
  type ColumnDataType,
} from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  type PgColumnBuilderBase,
  type PgTableExtraConfigValue,
  type PgColumn,
  type PgTable,
} from "drizzle-orm/pg-core";

export type ColOf<
  TData,
  TNotNull extends boolean = boolean,
  THasDefault extends boolean = boolean,
  TIsPrimaryKey extends boolean = boolean,
  TTableName extends string = string,
> = PgColumn<{
  name: string;
  tableName: TTableName;
  dataType: ColumnDataType;
  columnType: string;
  data: TData;
  driverParam: unknown;
  notNull: TNotNull;
  hasDefault: THasDefault;
  isPrimaryKey: TIsPrimaryKey;
  isAutoincrement: boolean;
  hasRuntimeDefault: boolean;
  enumValues: string[] | undefined;
  baseColumn: ColumnBaseConfig<ColumnDataType, string> | undefined;
  generated: GeneratedConfig | undefined;
}>;

/**
 * Drizzle's generated-column config shape. Kept local so we
 * don't depend on an internal export.
 */
type GeneratedConfig = {
  as: unknown;
  type: "always" | "byDefault";
};

export type MetaTable<TTableName extends string = string> = PgTable & {
  id: ColOf<number, true, true, true, TTableName>;
  createdAt: ColOf<Date, true, true, false, TTableName>;
  updatedAt: ColOf<Date, true, true, false, TTableName>;
  deletedAt: ColOf<Date, false, false, false, TTableName>;
};

import { type FieldOptions } from "./fields";
import { createId } from "@paralleldrive/cuid2";

type SearchableKey<TColumnsMap extends Record<string, PgColumnBuilderBase>> =
  Extract<keyof TColumnsMap, string>;

type FieldColumns<TFields extends FieldOptions> = {
  [Key in Extract<keyof TFields, string>]: PgColumnBuilderBase;
};

type ExtraConfigKey<
  TFields extends FieldOptions,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
> =
  | "id"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
  | "deletedAt"
  | "publicId"
  | Extract<keyof TFields, string>
  | Extract<keyof TColumnsMap, string>;

type ExtraConfigTable<
  TFields extends FieldOptions,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
> = {
  [Key in ExtraConfigKey<TFields, TColumnsMap>]?: PgColumn;
};

type BuildTableOptions<
  TName extends string,
  TFields extends FieldOptions,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
> = {
  name: TName;
  fields?: TFields;
  columns?: TColumnsMap;
  publicId?: boolean;
  searchable?: readonly [
    SearchableKey<TColumnsMap>,
    ...SearchableKey<TColumnsMap>[],
  ];
  extraConfig?: (
    table: ExtraConfigTable<TFields, TColumnsMap>,
  ) => PgTableExtraConfigValue[];
};

export function createColumnsFromFields<const T extends FieldOptions>(
  fields: T,
): FieldColumns<T> {
  const entries = Object.entries(fields).map(([key, field]) => {
    const columnName = field.column ?? key;

    let column;

    switch (field.kind) {
      case "boolean": {
        column = boolean(columnName);
        break;
      }
      case "number": {
        column = integer(columnName);
        break;
      }
      case "timestamp": {
        column = timestamp(columnName, { withTimezone: true });
        break;
      }
      case "jsonb": {
        column = jsonb(columnName);
        break;
      }
      case "text":
      default: {
        column = text(columnName);
        break;
      }
    }

    if (!field.nullable) {
      column = column.notNull();
    }

    if (field.unique) {
      column = column.unique();
    }

    return [key, column];
  });

  return Object.fromEntries(entries);
}

export const defineTable = <
  TName extends string,
  TFields extends FieldOptions,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
>({
  name,
  fields,
  columns,
  publicId = false,
  extraConfig,
  searchable = undefined,
}: BuildTableOptions<TName, TFields, TColumnsMap>) => {
  const resolvedSearchable =
    searchable ??
    (() => {
      if (!fields) {
        return undefined;
      }

      const keys = Object.entries(fields)
        .filter(([, field]) => "searchable" in field && field.searchable)
        .map(([key]) => key) as SearchableKey<TColumnsMap>[];

      return keys.length > 0
        ? ([keys[0], ...keys.slice(1)] as const)
        : undefined;
    })();

  return pgTable(
    name,
    {
      id: integer().primaryKey().generatedAlwaysAsIdentity(),
      ...(publicId
        ? {
            publicId: text("public_id")
              .$defaultFn(() => createId())
              .notNull()
              .unique(),
          }
        : {}),

      createdBy: integer("created_by"),
      createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
      deletedAt: timestamp("deleted_at", { withTimezone: true }),
      ...(fields && createColumnsFromFields(fields)),
      ...columns,
    },
    (t) => [
      index(`${name}_deleted_at_idx`)
        .on(t.deletedAt)
        .where(sql`${t.deletedAt} IS NOT NULL`),
      index(`${name}_created_at_idx`)
        .on(t.createdAt)
        .where(sql`${t.deletedAt} IS NULL`),
      ...(resolvedSearchable
        ? [
            (() => {
              let expression = sql`coalesce(${t[resolvedSearchable[0]]}, '')`;

              for (let i = 1; i < resolvedSearchable.length; i += 1) {
                expression = sql`${expression} || ' ' || coalesce(${t[resolvedSearchable[i]]}, '')`;
              }

              return index(`${name}_search_idx`).using(
                "gin",
                sql`to_tsvector('english', ${expression})`,
              );
            })(),
          ]
        : []),
      ...(extraConfig ? extraConfig(t) : []),
    ],
  );
};

export function selectFields<
  TTable extends MetaTable,
  TSelection extends FieldOptions,
>(table: TTable, selection: TSelection) {
  const columns = getTableColumns(table);
  const baseResult = {
    id: table.id,
    createdAt: table.createdAt,
    updatedAt: table.updatedAt,
  };

  const result = baseResult as typeof baseResult & Record<string, PgColumn>;

  for (const key in selection) {
    if (key in columns) {
      result[key] = columns[key];
    }
  }

  return result;
}
