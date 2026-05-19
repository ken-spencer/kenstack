import { tags } from "@kenstack/db/tables";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { deps } from "@app/deps";
import { blogTags } from "../tables";

type BlogTagQueryOptions = {
  preview?: boolean;
};

export function getBlogTag(
  slug: string,
  options: BlogTagQueryOptions = {},
) {
  const { preview = false } = options;
  return preview ? loadBlogTag(slug) : loadCachedBlogTag(slug);
}

async function loadCachedBlogTag(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog", `blog:tag:${slug}`);

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
  blogId: number,
  options: BlogTagQueryOptions = {},
) {
  const { preview = false } = options;
  return preview ? loadBlogTags(blogId) : loadCachedBlogTags(blogId);
}

async function loadCachedBlogTags(blogId: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog", `blog:${blogId}:tags`);

  return loadBlogTags(blogId);
}

async function loadBlogTags(blogId: number) {
  return deps.db
    .select({
      name: tags.name,
      slug: tags.slug,
    })
    .from(blogTags)
    .innerJoin(tags, eq(blogTags.tagId, tags.id))
    .where(eq(blogTags.tableId, blogId))
    .orderBy(asc(tags.name));
}
