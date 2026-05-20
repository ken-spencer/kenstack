import type { ComponentType, SVGProps } from "react";
import { NotebookPen } from "lucide-react";
import kebabCase from "lodash-es/kebabCase";
import startCase from "lodash-es/startCase";

import type { PreviewPath } from "@kenstack/admin";
import { defineBlogAdmin } from "./admin";
import { blogTables } from "./tables";

type BlogTables = typeof blogTables;

export type CreateBlogModuleOptions = {
  tables?: BlogTables;
  name?: string;
  title?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  basePath?: `/${string}`;
  previewPath?: PreviewPath;
};

export function createBlogModule({
  tables = blogTables,
  name = tables.prefix,
  title = startCase(name),
  icon = NotebookPen,
  basePath = `/${kebabCase(name)}`,
  previewPath = `${basePath}/${"${slug}"}`,
}: CreateBlogModuleOptions = {}) {
  const resolvedName = kebabCase(name);

  return {
    name: resolvedName,
    title,
    basePath,
    previewPath,
    tables,
    admin: defineBlogAdmin({
      tables,
      name: resolvedName,
      title,
      icon,
      previewPath,
    }),
  };
}

export type BlogModule = ReturnType<typeof createBlogModule>;
