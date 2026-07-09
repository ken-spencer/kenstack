import "server-only";

import { sql } from "drizzle-orm";
import snakeCase from "lodash-es/snakeCase";

import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
  boolean,
  type AnyPgTable,
  type PgColumnBuilderBase,
  type PgTableExtraConfigValue,
  type AnyPgColumn,
  type PgTableWithColumns,
} from "drizzle-orm/pg-core";
import type { BuildColumns } from "drizzle-orm/column-builder";
import { createId } from "@paralleldrive/cuid2";

type ColumnKey<TColumnsMap extends Record<string, PgColumnBuilderBase>> =
  Extract<keyof TColumnsMap, string>;

declare const definedTableBrand: unique symbol;

type DefinedTableBrand = {
  readonly [definedTableBrand]: true;
};

const baseTableColumns = () => ({
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
const publicIdColumn = () =>
  text("public_id").$defaultFn(() => createId()).notNull().unique();
const sortOrderColumn = () => integer("sort_order").notNull().default(0);
const visibilityColumn = () =>
  text("visibility", {
    enum: ["draft", "published", "unlisted"],
  })
    .notNull()
    .default("draft");
const publishedAtColumn = () =>
  timestamp("published_at", { withTimezone: true });
const ogImageColumn = () => integer("og_image");
const seoTitleColumn = () => text("seo_title").notNull().default("");
const seoDescriptionColumn = () =>
  text("seo_description").notNull().default("");
const publishColumns = () => ({
  visibility: visibilityColumn(),
  publishedAt: publishedAtColumn(),
});
const seoColumns = () => ({
  ogImage: ogImageColumn(),
  seoTitle: seoTitleColumn(),
  seoDescription: seoDescriptionColumn(),
});

type TableColumns<
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
  TPublicId extends boolean | undefined,
  TReorder extends boolean | undefined,
  TPublish extends boolean | undefined,
  TSeo extends boolean | undefined,
> = ReturnType<typeof baseTableColumns> &
  ([TPublicId] extends [false]
    ? Record<never, never>
    : { publicId: ReturnType<typeof publicIdColumn> }) &
  ([TReorder] extends [true]
    ? { sortOrder: ReturnType<typeof sortOrderColumn> }
    : Record<never, never>) &
  ([TPublish] extends [true]
    ? ReturnType<typeof publishColumns>
    : Record<never, never>) &
  ([TSeo] extends [true]
    ? ReturnType<typeof seoColumns>
    : Record<never, never>) &
  TColumnsMap;

type DefinedPgTable<
  TName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
  TPublicId extends boolean | undefined,
  TReorder extends boolean | undefined,
  TPublish extends boolean | undefined,
  TSeo extends boolean | undefined,
> = PgTableWithColumns<{
  name: TName;
  schema: undefined;
  columns: BuildColumns<
    TName,
    TableColumns<TColumnsMap, TPublicId, TReorder, TPublish, TSeo>,
    "pg"
  >;
  dialect: "pg";
}> &
  DefinedTableBrand;

export const metaColumns = {
  get visibility() {
    return visibilityColumn();
  },
  get publishedAt() {
    return publishedAtColumn();
  },
  get ogImage() {
    return ogImageColumn();
  },
  get draft() {
    return boolean("draft").notNull().default(true);
  },
  get seoTitle() {
    return seoTitleColumn();
  },
  get seoDescription() {
    return seoDescriptionColumn();
  },
};

export const addressColumns = {
  addressLine1: text("address_line_1").notNull().default(""),
  addressLine2: text("address_line_2").notNull().default(""),
  locality: text("locality").notNull().default(""),
  regionCode: varchar("region_code", { length: 64 }).notNull().default(""),
  postalCode: varchar("postal_code", { length: 32 }).notNull().default(""),
  countryCode: varchar("country_code", { length: 2 }).notNull().default("US"),
};

export type ExtraTable<
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
  TPublicId extends boolean | undefined = undefined,
  TReorder extends boolean | undefined = undefined,
  TPublish extends boolean | undefined = undefined,
  TSeo extends boolean | undefined = undefined,
> = {
  id: AnyPgColumn;
  createdBy: AnyPgColumn;
  createdAt: AnyPgColumn;
  updatedAt: AnyPgColumn;
  deletedAt: AnyPgColumn;
} & ([TPublicId] extends [false]
    ? Record<never, never>
    : { publicId: AnyPgColumn }) &
  ([TReorder] extends [true]
    ? { sortOrder: AnyPgColumn }
    : Record<never, never>) &
  ([TPublish] extends [true]
    ? { visibility: AnyPgColumn; publishedAt: AnyPgColumn }
    : Record<never, never>) &
  ([TSeo] extends [true]
    ? {
        ogImage: AnyPgColumn;
        seoTitle: AnyPgColumn;
        seoDescription: AnyPgColumn;
      }
    : Record<never, never>) & {
  [K in ColumnKey<TColumnsMap>]: AnyPgColumn;
};

export type BuildTableOptions<
  TName extends string,
  TColumnsMap extends Record<string, PgColumnBuilderBase>,
  TPublicId extends boolean | undefined = undefined,
  TReorder extends boolean | undefined = undefined,
  TPublish extends boolean | undefined = undefined,
  TSeo extends boolean | undefined = undefined,
> = {
  name: TName;
  publicId?: TPublicId;
  reorder?: TReorder;
  publish?: TPublish;
  seo?: TSeo;
  columns: TColumnsMap;
  extraConfig?: (
    table: ExtraTable<TColumnsMap, TPublicId, TReorder, TPublish, TSeo>,
  ) => PgTableExtraConfigValue[];
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
  const TPublicId extends boolean | undefined = undefined,
  const TReorder extends boolean | undefined = undefined,
  const TPublish extends boolean | undefined = undefined,
  const TSeo extends boolean | undefined = undefined,
>({
  name,
  publicId,
  reorder,
  publish,
  seo,
  columns,
  extraConfig,
}: BuildTableOptions<
  TName,
  TColumnsMap,
  TPublicId,
  TReorder,
  TPublish,
  TSeo
>): DefinedPgTable<
  TName,
  TColumnsMap,
  TPublicId,
  TReorder,
  TPublish,
  TSeo
> => {
  const tableColumns = {
    ...baseTableColumns(),
    ...(publicId !== false ? { publicId: publicIdColumn() } : {}),
    ...(reorder ? { sortOrder: sortOrderColumn() } : {}),
    ...(publish ? publishColumns() : {}),
    ...(seo ? seoColumns() : {}),
    ...columns,
  } as TableColumns<TColumnsMap, TPublicId, TReorder, TPublish, TSeo>;

  const table = pgTable(
    name,
    tableColumns as Record<string, PgColumnBuilderBase>,
    (t) => [
      index(`${name}_deleted_at_idx`)
        .on(t.deletedAt)
        .where(sql`${t.deletedAt} IS NOT NULL`),
      index(`${name}_created_at_idx`)
        .on(t.createdAt)
        .where(sql`${t.deletedAt} IS NULL`),
      ...(extraConfig
        ? extraConfig(
            t as ExtraTable<
              TColumnsMap,
              TPublicId,
              TReorder,
              TPublish,
              TSeo
            >,
          )
        : []),
    ],
  ) as unknown as DefinedPgTable<
    TName,
    TColumnsMap,
    TPublicId,
    TReorder,
    TPublish,
    TSeo
  >;

  return table;
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

export type AdminTable = AnyPgTable &
  DefinedTableBrand & {
  id: AnyPgColumn<{ data: number; notNull: true }>;
  createdBy: AnyPgColumn<{ data: number | null; notNull: false }>;
  createdAt: AnyPgColumn<{ data: Date; notNull: true }>;
  updatedAt: AnyPgColumn<{ data: Date; notNull: true }>;
  deletedAt: AnyPgColumn<{ data: Date | null; notNull: false }>;
};

export type AdminPublicIdTable = AdminTable & {
  publicId: AnyPgColumn<{ data: string; notNull: true }>;
};

export type AdminPublishTable = AdminTable & {
  visibility: AnyPgColumn<{ data: "draft" | "published" | "unlisted" }>;
  publishedAt: AnyPgColumn<{ data: Date | null }>;
};

export type AdminContentTable = AdminPublishTable;

export type AdminSeoTable = AdminTable & {
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
