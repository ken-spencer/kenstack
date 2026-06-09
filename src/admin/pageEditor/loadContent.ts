import type { Metadata } from "next";
import { deps } from "@app/deps";
import { and, eq } from "drizzle-orm";
import { type Prettify } from "@kenstack/types";

import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { selectMediaSubquery, type SelectedMedia } from "@kenstack/db/tables";
import { getDisplayValues } from "@kenstack/fields/display";
import { createDefaultValues } from "@kenstack/fields/createDefaultValues";
import { loadRecord } from "@kenstack/fields/records";
import type { DefinedField } from "@kenstack/fields/types";
import { pageEditorFieldNames, pageEditorFields } from "./fields";
import { pageEditorServerFields } from "./serverFields";

type ContentValue<TField extends DefinedField> = TField["kind"] extends "image"
  ? SelectedMedia | null
  : TField["default"];

export type ContentData = Prettify<
  {
    [Key in keyof typeof pageEditorFields]: ContentValue<
      (typeof pageEditorFields)[Key]
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

    const {
      tables: { content },
    } = deps;

    const { values } = await loadRecord({
      table: content,
      fields: pageEditorServerFields,
      defaults,
      where: and(eq(content.slug, slug)),
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

  const {
    db,
    tables: { content },
  } = deps;

  const [row] = await db
    .select({
      title: content.title,
      description: content.description,
      ogImage: selectMediaSubquery(content.ogImage, "original"),
      seoTitle: content.seoTitle,
      seoDescription: content.seoDescription,
    })
    .from(content)
    .where(
      and(
        eq(content.slug, slug),
        // multiTenant && tenant ? eq(content.orgId, org!.id) : undefined
      ),
    );
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
