/*
 * Public entry point: the admin metadata API for host applications.
 * Export only supported host-facing APIs. Kenstack code imports non-public
 * implementation from its canonical files, not through this entry point.
 */

import "server-only";

import type { Metadata } from "next";

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
