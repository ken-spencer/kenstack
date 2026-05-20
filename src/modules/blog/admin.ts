import { NotebookPen } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { adminConfig, type PreviewPath } from "@kenstack/admin";
import { selectImageSubquery } from "@kenstack/db/tables";
import client from "./client";
import { fields } from "./fields";
import { blogTables, defineBlogTables } from "./tables";

type BlogTables = ReturnType<typeof defineBlogTables>;

export function defineBlogAdmin({
  tables = blogTables,
  name = "blog",
  title = "Blog",
  icon = NotebookPen,
  previewPath = "/blog/${slug}",
}: {
  tables?: BlogTables;
  name?: string;
  title?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  previewPath?: PreviewPath;
} = {}) {
  const { posts, tags, images } = tables;

  return adminConfig({
    client,
    fields,
    title,
    icon,
    table: posts,
    revalidate: [name, ({ slug }) => `${name}:${slug}`],
    sort: {
      title: {
        fields: [posts.title],
      },
    },
    filters: {
      publishedAt: {
        field: posts.publishedAt,
        kind: "date-range",
        label: "Published",
      },
    },
    select: {
      title: posts.title,
      image: selectImageSubquery(posts.image, "square"),
      publishedAt: posts.publishedAt,
    },
    preview: previewPath,
    tags: { table: tags },
    galleries: {
      gallery: {
        table: images,
        tableIdKey: "tableId",
        tableId: images.tableId,
        imageIdKey: "imageId",
        imageId: images.imageId,
        sortOrderKey: "sortOrder",
        sortOrder: images.sortOrder,
      },
    },
  });
}

const config = defineBlogAdmin();

export default config;
