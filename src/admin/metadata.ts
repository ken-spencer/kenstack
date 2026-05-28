import type { Metadata } from "next";
import * as z from "zod";

import { selectImageSubquery } from "@kenstack/db/tables/images";
import { dateTimeField, imageField, textField } from "@kenstack/fields/client";
import { isPreviewRequest } from "./lib/searchParams";
import type { AdminContentTable } from "./table";
import { visibilityValues } from "./lib/visibility";

export { visibilityOptions, visibilityValues } from "./lib/visibility";

export const metaFieldOptions = {
  visibility: textField({
    default: "draft",
    zod: z.enum(visibilityValues),
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

export function metaSelect<TTable extends AdminContentTable>(table: TTable) {
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

export function createMetadataLoader(
  load: (
    value: string,
    options: { preview: boolean },
  ) => Promise<Parameters<typeof buildMetadata>[0]>,
  { field = "slug" }: { field?: string } = {},
) {
  return async function generateMetadata({
    params,
    searchParams,
  }: {
    params: Promise<Record<string, string>>;
    searchParams: Promise<unknown>;
  }) {
    const [routeParams, preview] = await Promise.all([
      params,
      isPreviewRequest(searchParams),
    ]);

    return buildMetadata(
      await load(routeParams[field], { preview }),
    );
  };
}
