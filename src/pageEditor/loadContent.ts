import type { Metadata } from "next";
import { deps } from "@app/deps";
import { and, eq } from "drizzle-orm";

import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import mdToHtml from "@kenstack/components/Markdown/mdToHtml";

export type Content = {
  title: string;
  description: string;
  content: string;
  contentHtml: string;
  seoTitle: string;
  seoDescription: string;
};

import { type Prettify } from "@kenstack/types";
export type DefaultValues = Prettify<Partial<Content>>;

export const loadContent = cache(
  async (
    slug: string,
    {
      // tenant,
      defaultValues = {},
    }: { tenant?: string; defaultValues?: DefaultValues } = {},
  ): Promise<Content> => {
    "use cache";
    cacheLife("max");

    if (!slug) {
      throw Error("slug is required");
    }

    const defaults = {
      title: "",
      description: "",
      content: "",
      contentHtml: "",
      seoTitle: "",
      seoDescription: "",
      ...defaultValues,
    } satisfies Content;

    const {
      db,
      // multiTenant,
      // getOrganizationBySlug,
      tables: { content },
    } = deps;

    // const org =
    //   multiTenant && tenant ? await getOrganizationBySlug(tenant) : null;
    // if (multiTenant && tenant) {
    //   if (!org) {
    //     throw new Error(`org ${tenant} was not loaded`);
    //   }
    //   cacheTag(`content:${org.id}:${slug}`);
    // } else {
    //   cacheTag("content:" + slug);
    // }
    cacheTag("content:" + slug);

    const [row] = await db
      .select({
        title: content.title,
        description: content.description,
        content: content.content,
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

    if (!row) {
      return defaults;
    }

    return {
      title: row.title ?? defaults.title,
      description: row.description ?? defaults.description,
      content: row.content ?? defaults.content,
      contentHtml: row.content ? await mdToHtml(row.content) : "",
      seoTitle: row.seoTitle ?? defaults.seoTitle,
      seoDescription: row.seoDescription ?? defaults.seoDescription,
    };
  },
);

export const loadMeta = async (
  slug: string,
  {
    tenant,
    defaultValues = {},
  }: { tenant?: string; defaultValues?: Partial<Content> } = {},
): Promise<Metadata> => {
  const { title, description, seoTitle, seoDescription } = await loadContent(
    slug,
    {
      tenant,
      defaultValues,
    },
  );

  return {
    title: seoTitle || title,
    description: seoDescription || description,
  };
};
