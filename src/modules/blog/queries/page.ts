import { selectImageSubquery } from "@kenstack/db/tables";
import { and, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { metaSelect } from "@kenstack/admin";
import { pageWhere } from "@kenstack/admin/queries";
import { deps } from "@app/deps";
import { blogs } from "../tables";
import { getBlogTags } from "./tags";

type BlogQueryOptions = {
  preview?: boolean;
};

export function getBlog(slug: string, options: BlogQueryOptions = {}) {
  return options.preview ? loadBlog(slug, options) : loadCachedBlog(slug);
}

async function loadCachedBlog(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog", `blog:${slug}`);

  return loadBlog(slug);
}

async function loadBlog(slug: string, options: BlogQueryOptions = {}) {
  const visibility = await pageWhere(blogs, options);
  const [row] = await deps.db
    .select({
      id: blogs.id,
      title: blogs.title,
      slug: blogs.slug,
      publishedAt: blogs.publishedAt,
      image: selectImageSubquery(blogs.image, "original"),
      description: blogs.description,
      content: blogs.content,
      ...metaSelect(blogs),
    })
    .from(blogs)
    .where(and(visibility, eq(blogs.slug, slug)))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    ...row,
    tags: await getBlogTags(row.id, options),
  };
}
