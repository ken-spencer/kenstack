import { getTableColumns, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  // boolean,
  // jsonb,
  type AnyPgTable,
  type PgColumnBuilderBase,
  type PgTableExtraConfigValue,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { type FieldOptions } from "./fields";
import { createId } from "@paralleldrive/cuid2";

// declare const defineTableBrand: unique symbol;

// type SearchableKey<TColumnsMap extends Record<string, PgColumnBuilderBase>> =
//   Extract<keyof TColumnsMap, string>;

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

  const result = baseResult as typeof baseResult & Record<string, AnyPgColumn>;

  for (const key in selection) {
    // const field = selection[key];
    if (key in columns) {
      (result as Record<string, AnyPgColumn>)[key] = columns[
        key as keyof typeof columns
      ] as AnyPgColumn;
    }
  }

  return result;
}

// type FieldKey<TFields extends FieldOptions> = Extract<keyof TFields, string>;
type ColumnKey<TColumnsMap extends Record<string, PgColumnBuilderBase>> =
  Extract<keyof TColumnsMap, string>;

// export function createColumnsFromFields<const T extends FieldOptions>(
//   fields: T,
// ) {
//   const entries = Object.entries(fields)
//     .filter(([, field]) => field.kind !== "virtual")
//     .map(([key, field]) => {
//       const columnName = field.column ?? key;

//       let column;

//       switch (field.kind) {
//         case "boolean": {
//           column = boolean(columnName);
//           break;
//         }
//         case "integer": {
//           column = integer(columnName);
//           break;
//         }
//         case "timestamp": {
//           column = timestamp(columnName, { withTimezone: true });
//           break;
//         }
//         case "integer-array": {
//           column = integer(columnName).array();
//           break;
//         }
//         case "text-array": {
//           column = text(columnName).array();
//           break;
//         }
//         case "jsonb": {
//           column = jsonb(columnName);
//           break;
//         }
//         case "text":
//         default: {
//           column = text(columnName);
//           break;
//         }
//       }

//       if (!field.nullable) {
//         column = column.notNull();
//       }

//       if (field.unique) {
//         column = column.unique();
//       }

//       return [key, column];
//     });

//   return Object.fromEntries(entries);
// }

type ExtraTable<TColumnsMap extends Record<string, PgColumnBuilderBase>> = {
  id: AnyPgColumn;
  createdBy: AnyPgColumn;
  createdAt: AnyPgColumn;
  updatedAt: AnyPgColumn;
  deletedAt: AnyPgColumn;
  publicId: AnyPgColumn;
} & {
  [K in ColumnKey<TColumnsMap>]: AnyPgColumn;
};

type BuildTableOptions<
  TName extends string,
  // TFields extends FieldOptions,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
  // TPublicId extends boolean = false,
> = {
  name: TName;
  // fields?: TFields;
  columns: TColumnsMap;
  // publicId?: TPublicId;
  // searchable?: readonly [
  //   SearchableKey<TColumnsMap>,
  //   ...SearchableKey<TColumnsMap>[],
  // ];
  extraConfig?: (table: ExtraTable<TColumnsMap>) => PgTableExtraConfigValue[];
};

export const defineTable = <
  TName extends string,
  const TColumnsMap extends Record<string, PgColumnBuilderBase>,
>({
  name,
  // fields,
  columns,
  // publicId = false as TPublicId,
  extraConfig,
  // searchable = undefined,
}: BuildTableOptions<TName, TColumnsMap>) => {
  const table = pgTable(
    name,
    {
      id: integer().primaryKey().generatedAlwaysAsIdentity(),
      publicId: text("public_id")
        .$defaultFn(() => createId())
        .notNull()
        .unique(),

      createdBy: integer("created_by"),
      createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
      deletedAt: timestamp("deleted_at", { withTimezone: true }),
      // ...(fields ? createColumnsFromFields(fields) : {}),
      ...columns,
    },
    (t) => [
      index(`${name}_deleted_at_idx`)
        .on(t.deletedAt)
        .where(sql`${t.deletedAt} IS NOT NULL`),
      index(`${name}_created_at_idx`)
        .on(t.createdAt)
        .where(sql`${t.deletedAt} IS NULL`),
      ...(extraConfig ? extraConfig(t as ExtraTable<TColumnsMap>) : []),
    ],
  );

  return table; // as typeof table & { [defineTableBrand]: true };
};

// export type DefinedTable = ReturnType<typeof defineTable>;
// export type MetaTable = DefinedTable;

export type MetaTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  publicId: AnyPgColumn<{ data: string; notNull: true }>;
  createdBy: AnyPgColumn<{ data: number | null; notNull: false }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
  deletedAt: AnyPgColumn<{ data: Date | null; notNull: false }>;
};
