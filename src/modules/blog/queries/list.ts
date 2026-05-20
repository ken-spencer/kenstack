import { selectImageSubquery, tags } from "@kenstack/db/tables";
import { and, desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { listWhere, pageWhere } from "@kenstack/admin/queries";
import { deps } from "@app/deps";
import {
  getBlogQueryTables,
  resolveBlogQuerySource,
  type BlogQuerySource,
  type BlogQuerySourceOptions,
} from "./source";

type ListBlogsOptions = {
  preview?: boolean;
  tag?: string;
};

type ListBlogsSourceOptions = ListBlogsOptions & BlogQuerySourceOptions;

export function listBlogs(
  tableName?: string,
  options: ListBlogsSourceOptions = {},
) {
  const { preview = false, tag } = options;
  const source = resolveBlogQuerySource(tableName, options);

  return preview
    ? loadBlogs(source, { preview, tag })
    : loadCachedBlogs(source, { tag });
}

async function loadCachedBlogs(
  source: BlogQuerySource,
  options: ListBlogsOptions,
) {
  "use cache";
  cacheLife("hours");
  cacheTag(
    source.name,
    ...(options.tag ? [`${source.name}:tag:${options.tag}`] : []),
  );

  return loadBlogs(source, options);
}

async function loadBlogs(
  source: BlogQuerySource,
  { preview = false, tag }: ListBlogsOptions = {},
) {
  const { posts, tags: postTags } = getBlogQueryTables(source);
  const blogListSelect = {
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    description: posts.description,
    publishedAt: posts.publishedAt,
    image: selectImageSubquery(posts.image, "square"),
  };
  const visibility = preview
    ? await pageWhere(posts, { preview })
    : listWhere(posts);

  if (tag) {
    return deps.db
      .select(blogListSelect)
      .from(posts)
      .innerJoin(postTags, eq(postTags.tableId, posts.id))
      .innerJoin(tags, eq(postTags.tagId, tags.id))
      .where(and(visibility, eq(tags.slug, tag)))
      .orderBy(desc(posts.publishedAt), desc(posts.id));
  }

  return deps.db
    .select(blogListSelect)
    .from(posts)
    .where(visibility)
    .orderBy(desc(posts.publishedAt), desc(posts.id));
}
