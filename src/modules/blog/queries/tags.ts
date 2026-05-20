import { tags } from "@kenstack/db/tables";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { deps } from "@app/deps";
import {
  getBlogQueryTables,
  resolveBlogQuerySource,
  type BlogQuerySource,
  type BlogQuerySourceOptions,
} from "./source";

type BlogTagQueryOptions = {
  preview?: boolean;
};

type BlogTagSourceOptions = BlogTagQueryOptions & BlogQuerySourceOptions;

export function getBlogTag(
  tableName: string,
  slug: string,
  options: BlogTagSourceOptions = {},
) {
  const { preview = false } = options;
  const source = resolveBlogQuerySource(tableName, options);

  return preview ? loadBlogTag(slug) : loadCachedBlogTag(source, slug);
}

async function loadCachedBlogTag(source: BlogQuerySource, slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(source.name, `${source.name}:tag:${slug}`);

  return loadBlogTag(slug);
}

async function loadBlogTag(slug: string) {
  const [row] = await deps.db
    .select({
      name: tags.name,
      slug: tags.slug,
    })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1);

  return row ?? null;
}

export function getBlogTags(
  tableName: string,
  blogId: number,
  options: BlogTagSourceOptions = {},
) {
  const { preview = false } = options;
  const source = resolveBlogQuerySource(tableName, options);

  return preview
    ? loadBlogTags(source, blogId)
    : loadCachedBlogTags(source, blogId);
}

async function loadCachedBlogTags(source: BlogQuerySource, blogId: number) {
  "use cache";
  cacheLife("hours");
  cacheTag(source.name, `${source.name}:${blogId}:tags`);

  return loadBlogTags(source, blogId);
}

async function loadBlogTags(source: BlogQuerySource, blogId: number) {
  const { tags: postTags } = getBlogQueryTables(source);

  return deps.db
    .select({
      name: tags.name,
      slug: tags.slug,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.tableId, blogId))
    .orderBy(asc(tags.name));
}
