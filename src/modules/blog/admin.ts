import { blogImages, blogs, blogTags } from "./tables";
import { NotebookPen } from "lucide-react";

import { adminConfig } from "@kenstack/admin";
import { selectImageSubquery } from "@kenstack/db/tables";
import client from "./client";
import { fields } from "./fields";

const config = adminConfig({
  client,
  fields,
  title: "Blog",
  icon: NotebookPen,
  table: blogs,
  revalidate: ["blog", ({ slug }) => `blog:${slug}`],
  sort: {
    title: {
      fields: [blogs.title],
    },
  },
  filters: {
    publishedAt: {
      field: blogs.publishedAt,
      kind: "date-range",
      label: "Published",
    },
  },
  select: {
    title: blogs.title,
    image: selectImageSubquery(blogs.image, "square"),
    publishedAt: blogs.publishedAt,
  },
  preview: "/blog/${slug}",
  tags: { table: blogTags },
  galleries: {
    gallery: {
      table: blogImages,
      tableIdKey: "tableId",
      tableId: blogImages.tableId,
      imageIdKey: "imageId",
      imageId: blogImages.imageId,
      sortOrderKey: "sortOrder",
      sortOrder: blogImages.sortOrder,
    },
  },
});

export default config;
