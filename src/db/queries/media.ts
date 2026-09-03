import { sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn, PgColumn } from "drizzle-orm/pg-core";

import { media } from "@kenstack/db/tables/media";
import type { CropSource, SquareCrop } from "@kenstack/db/tables/media/types";

type LooseMediaColumn<TColumn extends PgColumn> = AnyPgColumn<{
  data: TColumn["_"]["data"];
  driverParam: TColumn["_"]["driverParam"];
  notNull: TColumn["_"]["notNull"];
}>;

type MediaAliasKey =
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

type MediaAlias = {
  [Key in MediaAliasKey]: LooseMediaColumn<(typeof media)[Key]>;
};

export type MediaVariantName = "original" | "square";

function mediaVariantKey(variant: MediaVariantName) {
  return variant === "square" ? sql.raw("'square'") : sql.raw("'original'");
}

/**
 * Selects media fields from an already-joined media table alias.
 *
 * Use this when the query has explicit media joins, especially if several
 * media rows are selected or the join needs filtering/sorting. The selected
 * variant applies to raster image variants; files use their source URL.
 */
export const selectMedia = (
  alias: MediaAlias,
  variant: MediaVariantName = "original",
) => {
  const variantKey = mediaVariantKey(variant);

  return {
    kind: alias.kind,
    url: sql<string>`
      case
        when ${alias.kind} in ('svg', 'file') then ${alias.sourceUrl}
        else ${alias.variants}->${variantKey}->>'url'
      end
    `,
    width: sql<number | null>`
      case
        when ${alias.kind} = 'svg' then ${alias.sourceWidth}
        when ${alias.kind} = 'file' then null
        else (${alias.variants}->${variantKey}->>'width')::int
      end
    `,
    height: sql<number | null>`
      case
        when ${alias.kind} = 'svg' then ${alias.sourceHeight}
        when ${alias.kind} = 'file' then null
        else (${alias.variants}->${variantKey}->>'height')::int
      end
    `,
    alt: alias.alt,
  };
};

export type SelectedMedia = {
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
  original?: CropSource | null;
  squareCrop?: SquareCrop | null;
};

export type SelectedImage = SelectedMedia & {
  kind: "raster" | "svg";
};

/**
 * Selects a single media row as JSON from a foreign-key column.
 *
 * Use this for compact record queries where adding a media join would add more
 * ceremony than clarity. Prefer `selectMedia` when the media table is already
 * joined or the query needs to reason about media rows directly.
 */
export function selectMediaSubquery(
  mediaCol: AnyPgColumn,
  variant: MediaVariantName = "original",
) {
  return mediaSubquery(mediaCol, variant, false);
}

/** Selects a single raster or SVG media row from a foreign-key column. */
export function selectImageSubquery(
  mediaCol: AnyPgColumn,
  variant: MediaVariantName = "original",
) {
  return mediaSubquery(mediaCol, variant, true);
}

function mediaSubquery(
  mediaCol: AnyPgColumn,
  variant: MediaVariantName,
  imagesOnly: true,
): SQL<SelectedImage | null>;
function mediaSubquery(
  mediaCol: AnyPgColumn,
  variant: MediaVariantName,
  imagesOnly: false,
): SQL<SelectedMedia | null>;
function mediaSubquery(
  mediaCol: AnyPgColumn,
  variant: MediaVariantName,
  imagesOnly: boolean,
) {
  const variantKey = mediaVariantKey(variant);

  return sql<SelectedMedia | null>`(
  select jsonb_build_object(
    'id', ${media.id},
    'kind', ${media.kind},
    'url', case
      when ${media.kind} in ('svg', 'file') then ${media.sourceUrl}
      else ${media.variants}->${variantKey}->>'url'
    end,
    'width', case
      when ${media.kind} = 'svg' then ${media.sourceWidth}
      when ${media.kind} = 'file' then null
      else (${media.variants}->${variantKey}->>'width')::int
    end,
    'height', case
      when ${media.kind} = 'svg' then ${media.sourceHeight}
      when ${media.kind} = 'file' then null
      else (${media.variants}->${variantKey}->>'height')::int
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
      when ${media.kind} in ('svg', 'file') then ${media.sourceUrl}
      else ${media.variants}->'original'->>'url'
    end,
    'original', case
      when ${media.kind} = 'raster' then jsonb_build_object(
        'url', ${media.variants}->'original'->>'url',
        'width', (${media.variants}->'original'->>'width')::int,
        'height', (${media.variants}->'original'->>'height')::int
      )
      else null
    end,
    'squareCrop', ${media.variants}->'squareCrop'
  )
  from ${media}
  where ${media.id} = ${mediaCol}
  ${imagesOnly ? sql`and ${media.kind} in ('raster', 'svg')` : sql``}
  limit 1
)`;
}
