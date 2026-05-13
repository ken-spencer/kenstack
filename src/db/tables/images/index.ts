import type { ImageVariants } from "./types";
import { defineTable } from "@kenstack/admin/table";
import {
  text,
  integer,
  jsonb,
  index,
  pgEnum,
  type PgColumn,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const imageKindEnum = pgEnum("image_kind", ["raster", "svg"]);
export const imageStatusEnum = pgEnum("image_status", [
  "pending",
  "uploaded",
  "attached",
  "removed",
]);

export const images = defineTable({
  name: "images",
  columns: {
    status: imageStatusEnum("status").notNull(),
    kind: imageKindEnum("kind").notNull(),
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
  extraConfig: (t) => [index("images_status_idx").on(t.status)],
});

// import { alias as pgAlias } from "drizzle-orm/pg-core";
// const image = pgAlias(images, "image");
// const avatar = pgAlias(images, "avatar");
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
  [Key in ImageAliasKey]: LooseImageColumn<(typeof images)[Key]>;
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
  kind: "raster" | "svg";
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
};

export const selectImageSubquery = (
  imageCol: AnyPgColumn,
  variant: ImageVariantName = "original",
) => sql<SelectedImage | null>`(
  select jsonb_build_object(
    'id', ${images.id},
    'kind', ${images.kind},
    'url', case
      when ${images.kind} = 'svg' then ${images.sourceUrl}
      else ${images.variants}->${variant}->>'url'
    end,
    'width', case
      when ${images.kind} = 'svg' then ${images.sourceWidth}
      else (${images.variants}->${variant}->>'width')::int
    end,
    'height', case
      when ${images.kind} = 'svg' then ${images.sourceHeight}
      else (${images.variants}->${variant}->>'height')::int
    end,
    'alt', ${images.alt},
    'title', ${images.title},
    'caption', ${images.caption},
    'filename', ${images.filename},
    'sourceType', ${images.sourceType},
    'sourceSize', ${images.sourceSize},
    'sourceWidth', ${images.sourceWidth},
    'sourceHeight', ${images.sourceHeight},
    'originalUrl', case
      when ${images.kind} = 'svg' then ${images.sourceUrl}
      else ${images.variants}->'original'->>'url'
    end
  )
  from ${images}
  where ${images.id} = ${imageCol}
  limit 1
)`;
