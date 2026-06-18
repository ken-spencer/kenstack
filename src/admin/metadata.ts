import "server-only";

import type { Metadata } from "next";

import { selectMediaSubquery } from "@kenstack/db/tables/media";
import type { AdminSeoTable } from "./table";

export function metaSelect<TTable extends AdminSeoTable>(table: TTable) {
  return {
    seoTitle: table.seoTitle,
    seoDescription: table.seoDescription,
    ogImage: selectMediaSubquery(table.ogImage, "original"),
  };
}

export function buildMetadata(
  record:
    | {
        title?: string | null;
        description?: string | null;
        seoTitle?: string | null;
        seoDescription?: string | null;
        image?: {
          url?: string | null;
          width?: number | null;
          height?: number | null;
          alt?: string | null;
        } | null;
        ogImage?: {
          url?: string | null;
          width?: number | null;
          height?: number | null;
          alt?: string | null;
        } | null;
      }
    | null
    | undefined,
) {
  if (!record) {
    return {} satisfies Metadata;
  }

  const title = record.seoTitle || record.title || undefined;
  const description = record.seoDescription || record.description || undefined;
  const image = record.ogImage ?? record.image;
  const url = image?.url;

  return {
    title,
    description,
    openGraph: url
      ? {
          images: [
            {
              url,
              width: image.width ?? undefined,
              height: image.height ?? undefined,
              alt: image.alt || title || "",
            },
          ],
        }
      : undefined,
  } satisfies Metadata;
}
