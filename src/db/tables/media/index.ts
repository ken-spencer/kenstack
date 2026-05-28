import type { ImageVariants, SquareCrop } from "./types";
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
  type PgColumn,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

// import { alias as pgAlias } from "drizzle-orm/pg-core";
// const image = pgAlias(media, "image");
// const avatar = pgAlias(media, "avatar");
// .leftJoin(image, eq(posts.imageId, image.id))

type LooseImageColumn<TColumn extends PgColumn> = AnyPgColumn<{
  data: TColumn["_"]["data"];
  driverParam: TColumn["_"]["driverParam"];
  notNull: TColumn["_"]["notNull"];
}>;

type ImageAliasKey =
  | "publicId"
  | "kind"
  | "sourceUrl"
  | "filename"
  | "sourceType"
  | "sourceSize"
  | "sourceWidth"
  | "sourceHeight"
  | "variants"
  | "alt"
  | "title"
  | "caption";

type ImageAlias = {
  [Key in ImageAliasKey]: LooseImageColumn<(typeof media)[Key]>;
};

type ImageVariantName = "original" | "square";

export const selectImage = (
  alias: ImageAlias,
  variant: ImageVariantName = "original",
) => ({
  // id: alias.publicId,
  kind: alias.kind,
  url: sql<string>`
      case
        when ${alias.kind} = 'svg' then ${alias.sourceUrl}
        else ${alias.variants}->${variant}->>'url'
      end
    `,
  width: sql<number | null>`
      case
        when ${alias.kind} = 'svg' then ${alias.sourceWidth}
        else (${alias.variants}->${variant}->>'width')::int
      end
    `,
  height: sql<number | null>`
      case
        when ${alias.kind} = 'svg' then ${alias.sourceHeight}
        else (${alias.variants}->${variant}->>'height')::int
      end
    `,
  alt: alias.alt,
});

export type SelectedImage = {
  id?: number;
  kind: "raster" | "svg" | "file";
  url: string;
  width: number | null;
  height: number | null;
  alt: string | null;
  title?: string | null;
  caption?: string | null;
  filename?: string | null;
  sourceType?: string | null;
  sourceSize?: number | null;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  originalUrl?: string | null;
  squareCrop?: SquareCrop | null;
};

export function selectImageSubquery(
  imageCol: AnyPgColumn,
  variant: ImageVariantName = "original",
) {
  return sql<SelectedImage | null>`(
  select jsonb_build_object(
    'id', ${media.id},
    'kind', ${media.kind},
    'url', case
      when ${media.kind} = 'svg' then ${media.sourceUrl}
      else ${media.variants}->${variant}->>'url'
    end,
    'width', case
      when ${media.kind} = 'svg' then ${media.sourceWidth}
      else (${media.variants}->${variant}->>'width')::int
    end,
    'height', case
      when ${media.kind} = 'svg' then ${media.sourceHeight}
      else (${media.variants}->${variant}->>'height')::int
    end,
    'alt', ${media.alt},
    'title', ${media.title},
    'caption', ${media.caption},
    'filename', ${media.filename},
    'sourceType', ${media.sourceType},
    'sourceSize', ${media.sourceSize},
    'sourceWidth', ${media.sourceWidth},
    'sourceHeight', ${media.sourceHeight},
    'originalUrl', case
      when ${media.kind} = 'svg' then ${media.sourceUrl}
      else ${media.variants}->'original'->>'url'
    end,
    'squareCrop', ${media.variants}->'squareCrop'
  )
  from ${media}
  where ${media.id} = ${imageCol}
  limit 1
)`;
}
