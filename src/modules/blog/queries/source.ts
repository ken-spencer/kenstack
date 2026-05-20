import kebabCase from "lodash-es/kebabCase";
import pluralize from "pluralize";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";

import type { AdminContentTable } from "@kenstack/admin/table";
import type { TagsTable } from "@kenstack/db/tables";
import { deps } from "@app/deps";
import { blogTables } from "../tables";

export type BlogQuerySource = {
  name: string;
  tableName: string;
  prefix: string;
};

export type BlogQuerySourceOptions = {
  name?: string;
  prefix?: string;
};

type BlogPostTable = typeof blogTables.posts;

export function resolveBlogQuerySource(
  tableName = blogTables.tableName,
  {
    name = tableName,
    prefix = pluralize.singular(tableName),
  }: BlogQuerySourceOptions = {},
): BlogQuerySource {
  return {
    name: kebabCase(name),
    tableName,
    prefix,
  };
}

export function getBlogQueryTables({ tableName, prefix }: BlogQuerySource) {
  return {
    posts: getTable<BlogPostTable>(tableName),
    tags: getTable<TagsTable>(`${prefix}_tags`),
  };
}

function getTable<TTable extends AdminContentTable | TagsTable>(
  tableName: string,
) {
  const table = Object.values(deps.tables).find(
    (candidate) =>
      is(candidate, PgTable) && getTableName(candidate) === tableName,
  );

  if (!is(table, PgTable) || getTableName(table) !== tableName) {
    throw new Error(
      `Blog table "${tableName}" is not registered in deps.tables.`,
    );
  }

  return table as unknown as TTable;
}
