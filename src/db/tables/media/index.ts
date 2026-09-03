import type { ImageVariants } from "./types";
import { defineTable, type AdminTable } from "@kenstack/admin/table";
import {
  text,
  integer,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
  pgTable,
  pgEnum,
} from "drizzle-orm/pg-core";
import snakeCase from "lodash-es/snakeCase";

export const mediaKindEnum = pgEnum("media_kind", ["raster", "svg", "file"]);
export const mediaStatusEnum = pgEnum("media_status", [
  "pending",
  "uploaded",
  "attached",
  "removed",
]);

export const media = defineTable({
  name: "media",
  publicId: true,
  columns: {
    status: mediaStatusEnum("status").notNull(),
    kind: mediaKindEnum("kind").notNull(),
    table: text("table"),
    field: text("field"),
    filename: text("filename").notNull(),
    prefix: text("prefix").notNull(),
    baseName: text("base_name").notNull(),
    alt: text("alt"),
    title: text("title"),
    caption: text("caption"),
    sourceKey: text("source_key").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceType: text("source_type").notNull(),
    sourceSize: integer("source_size"),
    sourceWidth: integer("source_width"),
    sourceHeight: integer("source_height"),
    variants: jsonb("variants").$type<ImageVariants>(),
  },
  extraConfig: (t) => [index("media_status_idx").on(t.status)],
});

export const defineMediaList = ({
  table,
  prefix,
}: {
  table: AdminTable;
  prefix: string;
}) => {
  const tablePrefix = snakeCase(prefix);
  const name = `${tablePrefix}_media`;
  const tableIdColumn = `${tablePrefix}_id`;

  return pgTable(
    name,
    {
      tableId: integer(tableIdColumn).notNull(),
      mediaId: integer("media_id").notNull(),
      sortOrder: integer("sort_order").notNull().default(0),
    },
    (t) => [
      foreignKey({
        columns: [t.tableId],
        foreignColumns: [table.id],
        name: `${name}_${tablePrefix}_fk`,
      }).onDelete("cascade"),
      foreignKey({
        columns: [t.mediaId],
        foreignColumns: [media.id],
        name: `${name}_media_fk`,
      }).onDelete("cascade"),
      uniqueIndex(`${name}_unique`).on(t.tableId, t.mediaId),
      index(`${name}_sort_order_idx`).on(t.tableId, t.sortOrder),
    ],
  );
};
