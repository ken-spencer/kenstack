import type { Metadata } from "next";

import { selectImageSubquery } from "@kenstack/db/tables/media";
import {
  dateTimeField,
  imageField,
  radioButtonField,
  textField,
} from "@kenstack/fields/client";
import type { AdminSeoTable } from "./table";
import { visibilityStatusOptions } from "./lib/visibilityStatus";

export { visibilityOptions, visibilityValues } from "./lib/visibility";

export const metaFieldOptions = {
  visibility: radioButtonField({
    default: "draft",
    options: visibilityStatusOptions,
  }),
  publishedAt: dateTimeField({
    filter: true,
    sort: { defaultDirection: "desc" },
  }),
  ogImage: imageField(),
  seoTitle: textField({
    searchable: true,
  }),
  seoDescription: textField({
    searchable: true,
  }),
} as const;

export function metaSelect<TTable extends AdminSeoTable>(table: TTable) {
  return {
    seoTitle: table.seoTitle,
    seoDescription: table.seoDescription,
    ogImage: selectImageSubquery(table.ogImage, "original"),
  };
}

export function buildMetadata(
  record: {
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
  } | null | undefined,
) {
  if (!record) {
    return {} satisfies Metadata;
  }

  const title = record.seoTitle || record.title || undefined;
  const description =
    record.seoDescription || record.description || undefined;
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
