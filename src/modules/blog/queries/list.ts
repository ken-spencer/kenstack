import { selectImageSubquery, tags } from "@kenstack/db/tables";
import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { listWhere, pageWhere } from "@kenstack/admin/queries";
import { deps } from "@app/deps";
import { blogTags, blogs } from "../tables";

type ListBlogsOptions = {
  preview?: boolean;
  tag?: string;
};

const blogListSelect = {
  id: blogs.id,
  title: blogs.title,
  slug: blogs.slug,
  description: blogs.description,
  publishedAt: blogs.publishedAt,
  image: selectImageSubquery(blogs.image, "square"),
};

export function listBlogs(options: ListBlogsOptions = {}) {
  const { preview = false, ...cacheOptions } = options;
  return preview ? loadBlogs(options) : loadCachedBlogs(cacheOptions);
}

async function loadCachedBlogs(options: ListBlogsOptions) {
  "use cache";
  cacheLife("hours");
  cacheTag("blog", ...(options.tag ? [`blog:tag:${options.tag}`] : []));

  return loadBlogs(options);
}

async function loadBlogs({ preview = false, tag }: ListBlogsOptions = {}) {
  const visibility = preview
    ? await pageWhere(blogs, { preview })
    : listWhere(blogs);

  if (tag) {
    return deps.db
      .select(blogListSelect)
      .from(blogs)
      .innerJoin(blogTags, eq(blogTags.tableId, blogs.id))
      .innerJoin(tags, eq(blogTags.tagId, tags.id))
      .where(and(visibility, eq(tags.slug, tag)))
      .orderBy(desc(blogs.publishedAt), desc(blogs.id));
  }

  return deps.db
    .select(blogListSelect)
    .from(blogs)
    .where(visibility)
    .orderBy(desc(blogs.publishedAt), desc(blogs.id));
}
