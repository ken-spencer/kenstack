import { selectImageSubquery } from "@kenstack/db/tables";
import { and, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { metaSelect } from "@kenstack/admin";
import { pageWhere } from "@kenstack/admin/queries";
import { deps } from "@app/deps";
import {
  getBlogQueryTables,
  resolveBlogQuerySource,
  type BlogQuerySource,
  type BlogQuerySourceOptions,
} from "./source";
import { getBlogTags } from "./tags";

type BlogQueryOptions = {
  preview?: boolean;
};

type BlogSourceOptions = BlogQueryOptions & BlogQuerySourceOptions;

export function getBlog(
  tableName: string,
  slug: string,
  options: BlogSourceOptions = {},
) {
  const { preview = false } = options;
  const source = resolveBlogQuerySource(tableName, options);

  return preview
    ? loadBlog(source, slug, options)
    : loadCachedBlog(source, slug);
}

async function loadCachedBlog(source: BlogQuerySource, slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(source.name, `${source.name}:${slug}`);

  return loadBlog(source, slug);
}

async function loadBlog(
  source: BlogQuerySource,
  slug: string,
  options: BlogQueryOptions = {},
) {
  const { posts } = getBlogQueryTables(source);
  const visibility = await pageWhere(posts, options);
  const [row] = await deps.db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      publishedAt: posts.publishedAt,
      image: selectImageSubquery(posts.image, "original"),
      description: posts.description,
      content: posts.content,
      ...metaSelect(posts),
    })
    .from(posts)
    .where(and(visibility, eq(posts.slug, slug)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    tags: await getBlogTags(source.tableName, row.id, {
      ...options,
      name: source.name,
      prefix: source.prefix,
    }),
  };
}
