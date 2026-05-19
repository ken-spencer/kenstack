import type { Metadata } from "next";
import * as z from "zod";

import { selectImageSubquery } from "@kenstack/db/tables/images";
import type { AdminContentTable } from "./table";

const visibilityValues = ["draft", "published", "unlisted"] as const;
type VisibilityOption = readonly [
  value: (typeof visibilityValues)[number],
  label: string,
  description?: string,
];

const optionalDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.date().nullable(),
);

export const visibilityOptions: readonly VisibilityOption[] = [
  ["draft", "Draft"],
  ["published", "Published"],
  ["unlisted", "Unlisted"],
];

export const metaFieldOptions = {
  visibility: {
    default: "draft",
    zod: z.enum(visibilityValues),
  },
  publishedAt: {
    default: "",
    zod: z.string().datetime({ precision: 3 }).or(z.literal("")),
    serverZod: optionalDate,
  },
  ogImage: { kind: "image" },
  seoTitle: {
    default: "",
    zod: z.string(),
    searchable: true,
  },
  seoDescription: {
    default: "",
    zod: z.string(),
    searchable: true,
  },
} as const;

export function metaSelect<TTable extends AdminContentTable>(table: TTable) {
  return {
    seoTitle: table.seoTitle,
    seoDescription: table.seoDescription,
    ogImage: selectImageSubquery(table.ogImage, "original"),
  };
}

type MetadataImage = {
  url?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
};

type MetadataRecord = {
  title?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  image?: MetadataImage | null;
  ogImage?: MetadataImage | null;
} | null;

export function buildMetadata(record: MetadataRecord): Metadata {
  if (!record) {
    return {};
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
  };
}
