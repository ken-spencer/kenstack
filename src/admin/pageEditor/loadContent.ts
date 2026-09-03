import type { Metadata } from "next";
import { db } from "@app/db";
import { eq, type SQL } from "drizzle-orm";
import { type Prettify } from "@kenstack/types";

import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { selectImageSubquery } from "@kenstack/db/queries/media";
import { content } from "@kenstack/db/tables/content";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { loadRecord } from "@kenstack/records";
import { pageEditorFieldNames, pageEditorFields } from "./fields";
import { getDisplayValues } from "./display";
import { pageEditorServerFields } from "./serverFields";

type ContentValue<TField extends { default: unknown }> = TField extends {
  select: (...args: never[]) => infer TSelection;
}
  ? Exclude<TSelection, undefined> extends SQL<infer TValue>
    ? TValue
    : TField["default"]
  : TField["default"];

export type ContentData = Prettify<
  {
    [Key in keyof typeof pageEditorServerFields]: ContentValue<
      (typeof pageEditorServerFields)[Key]
    >;
  } & Record<string, unknown>
>;

export type DefaultValues = Prettify<Partial<ContentData>>;

export const loadContent = cache(
  async (
    slug: string,
    {
      defaultValues = {},
    }: { tenant?: string; defaultValues?: DefaultValues } = {},
  ) => {
    "use cache";
    cacheLife("max");
    cacheTag("content:" + slug);

    if (!slug) {
      throw Error("slug is required");
    }

    const defaults = {
      ...createDefaultValues(pageEditorFields),
      ...defaultValues,
    } satisfies ContentData;

    const { values } = await loadRecord({
      table: content,
      fields: pageEditorServerFields,
      defaults,
      where: eq(content.slug, slug),
    });

    const data = Object.fromEntries(
      pageEditorFieldNames.map((key) => [key, values[key] ?? defaults[key]]),
    ) as ContentData;

    return {
      data,
      display: await getDisplayValues(pageEditorServerFields, data),
    };
  },
);

export type Content = Awaited<ReturnType<typeof loadContent>>;

export const loadMeta = async (
  slug: string,
  options: { tenant?: string; defaultValues?: DefaultValues } = {},
) => {
  "use cache";
  cacheLife("max");
  cacheTag("content:" + slug);

  const { defaultValues = {} } = options;

  if (!slug) {
    throw Error("slug is required");
  }

  const [row] = await db
    .select({
      title: content.title,
      description: content.description,
      ogImage: selectImageSubquery(content.ogImage),
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
    })
    .from(content)
    .where(eq(content.slug, slug));
  const title =
    row?.seoTitle ||
    row?.title ||
    defaultValues.seoTitle ||
    defaultValues.title;
  const image = row?.ogImage ?? defaultValues.ogImage;

  return {
    title,
    description:
      row?.seoDescription ||
      row?.description ||
      defaultValues.seoDescription ||
      defaultValues.description,
    openGraph:
      image && typeof image === "object" && !("action" in image) && image.url
        ? {
            images: [
              {
                url: image.url,
                width: image.width ?? undefined,
                height: image.height ?? undefined,
                alt: image.alt || title,
              },
            ],
          }
        : undefined,
  } satisfies Metadata;
};
