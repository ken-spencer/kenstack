import { sql } from "drizzle-orm";
import snakeCase from "lodash-es/snakeCase";

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  boolean,
  // jsonb,
  type AnyPgTable,
  type PgColumnBuilderBase,
  type PgTableExtraConfigValue,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// declare const defineTableBrand: unique symbol;

// type SearchableKey<TColumnsMap extends Record<string, PgColumnBuilderBase>> =
//   Extract<keyof TColumnsMap, string>;

// type FieldKey<TFields extends FieldOptions> = Extract<keyof TFields, string>;
type ColumnKey<TColumnsMap extends Record<string, PgColumnBuilderBase>> =
  Extract<keyof TColumnsMap, string>;

export const metaColumns = {
  get visibility() {
    return text("visibility", {
      enum: ["draft", "published", "unlisted"],
    })
      .notNull()
      .default("draft");
  },
  get publishedAt() {
    return timestamp("published_at", { withTimezone: true });
  },
  get ogImage() {
    return integer("og_image");
  },
  get draft() {
    return boolean("draft").notNull().default(true);
  },
  get seoTitle() {
    return text("seo_title").notNull().default("");
  },
  get seoDescription() {
    return text("seo_description").notNull().default("");
  },
};

export type ExtraTable<
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
> = {
  id: AnyPgColumn;
  createdBy: AnyPgColumn;
  createdAt: AnyPgColumn;
  updatedAt: AnyPgColumn;
  deletedAt: AnyPgColumn;
  publicId: AnyPgColumn;
} & {
  [K in ColumnKey<TColumnsMap>]: AnyPgColumn;
};

export type BuildTableOptions<
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

export type BuildKeyTableOptions<
  TName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
> = {
  name: TName;
  columns: TColumnsMap;
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

export const defineKeyTable = <
  TName extends string,
  const TColumnsMap extends Record<string, PgColumnBuilderBase>,
>({
  name,
  columns,
}: BuildKeyTableOptions<TName, TColumnsMap>) => {
  const table = pgTable(name, {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    key: text("key").notNull().unique(),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    ...columns,
  });

  return table;
};

// export type DefinedTable = ReturnType<typeof defineTable>;
// export type AdminTable = DefinedTable;

export type AdminTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  publicId: AnyPgColumn<{ data: string; notNull: true }>;
  createdBy: AnyPgColumn<{ data: number | null; notNull: false }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
  deletedAt: AnyPgColumn<{ data: Date | null; notNull: false }>;
};

export type AdminContentTable = AdminTable & {
  visibility: AnyPgColumn<{ data: "draft" | "published" | "unlisted" }>;
  publishedAt: AnyPgColumn<{ data: Date | null }>;
  ogImage: AnyPgColumn<{ data: number | null }>;
  seoTitle: AnyPgColumn<{ data: string | null }>;
  seoDescription: AnyPgColumn<{ data: string | null }>;
};

export type AdminKeyTable = AnyPgTable & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  key: AnyPgColumn<{ data: string; notNull: true }>;
  createdBy: AnyPgColumn<{ data: number | null; notNull: false }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
};

type RelationshipEntity<TName extends string, TTable extends AdminTable> = {
  name: TName;
  table: TTable;
};

type RelationshipColumns<TFromName extends string, TToName extends string> = {
  [K in `${TFromName}Id` | `${TToName}Id` | "relationship"]: AnyPgColumn;
};

export function defineRelationship<
  const TName extends string,
  const TFromName extends string,
  const TToName extends string,
  TFromTable extends AdminTable,
  TToTable extends AdminTable,
>({
  name,
  from,
  to,
}: {
  name: TName;
  from: RelationshipEntity<TFromName, TFromTable>;
  to: RelationshipEntity<TToName, TToTable>;
}) {
  const fromKey = `${from.name}Id` as const;
  const toKey = `${to.name}Id` as const;

  const columns = {
    [fromKey]: integer(`${snakeCase(from.name)}_id`)
      .notNull()
      .references(() => from.table.id, { onDelete: "cascade" }),
    [toKey]: integer(`${snakeCase(to.name)}_id`)
      .notNull()
      .references(() => to.table.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
  } satisfies Record<string, PgColumnBuilderBase>;

  const table = defineTable({
    name,
    columns,
    extraConfig: (t) => [
      uniqueIndex(
        `${name}_${snakeCase(from.name)}_id_${snakeCase(to.name)}_id_relationship_unique`,
      ).on(t[fromKey], t[toKey], t.relationship),
      index(`${name}_${snakeCase(from.name)}_id_idx`).on(t[fromKey]),
      index(`${name}_${snakeCase(to.name)}_id_idx`).on(t[toKey]),
    ],
  });

  return table as typeof table & RelationshipColumns<TFromName, TToName>;
}
