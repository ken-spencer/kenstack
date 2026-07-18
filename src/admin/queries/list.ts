import {
  and,
  eq,
  getTableColumns,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import isEqual from "lodash-es/isEqual";

import { deps } from "@app/deps";
import {
  createDefaultListQueryState,
  parseListSearchParams,
  searchParamsToRecord,
  type ListQuery,
} from "@kenstack/list/querySchema";
import type {
  AnyAdminConfig,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import type { BaseListItem } from "@kenstack/admin/client";
import type { AdminContentTable } from "@kenstack/admin/table";
import { getSortMeta } from "@kenstack/admin/types/list";
import { resolveListOrderBy, resolveListWhere } from "@kenstack/list/server";

export type AdminListQuery = ListQuery;

export type AdminListConfig = Extract<AnyAdminConfig, { list: unknown }>;

export function adminListCacheTag(name: string) {
  return `admin-list:${name}`;
}

export async function loadAdminList({
  adminConfig,
  name,
  moduleParent,
  parentId,
  query,
}: {
  adminConfig: AdminListConfig;
  name: string;
  moduleParent?: ModuleParentOptions;
  parentId?: number;
  query: ListQuery;
}) {
  if (moduleParent || parentId) {
    return {
      data: await queryAdminList({
        adminConfig,
        moduleParent,
        parentId,
        query,
      }),
    };
  }

  if (isDefaultAdminListQuery(adminConfig, query)) {
    return {
      data: await loadCachedBaseAdminList(name),
    };
  }

  return {
    data: await queryAdminList({ adminConfig, query }),
  };
}

async function loadCachedBaseAdminList(name: string) {
  "use cache";
  cacheLife("max");
  cacheTag("admin", adminListCacheTag(name));

  const adminConfig = deps.modules[name]?.admin;

  if (!adminConfig || !("list" in adminConfig)) {
    return {
      status: "error",
      message: "This admin config is not listable.",
    } as const;
  }

  const sort = getSortMeta(adminConfig.list.sort);
  const baseListQuery = {
    ...createDefaultListQueryState(sort),
    page: 1,
  };

  return queryAdminList({ adminConfig, query: baseListQuery });
}

function isDefaultAdminListQuery(
  adminConfig: AdminListConfig,
  query: ListQuery,
) {
  const defaults = createDefaultListQueryState(
    getSortMeta(adminConfig.list.sort),
  );

  return (
    query.page === 1 &&
    query.keywords === defaults.keywords &&
    query.trash === defaults.trash &&
    query.sort === defaults.sort &&
    query.direction === defaults.direction &&
    isEqual(query.filters, defaults.filters)
  );
}

export async function queryAdminList({
  adminConfig,
  moduleParent,
  parentId,
  query: data,
}: {
  adminConfig: AdminListConfig;
  moduleParent?: ModuleParentOptions;
  parentId?: number;
  query: AdminListQuery;
}) {
  if ((moduleParent && !parentId) || (!moduleParent && parentId)) {
    return {
      status: "error",
      message: "Parent ID is missing.",
    } as const;
  }

  const isReorderSort = adminConfig.list.sort[data.sort]?.direction === false;
  const limit = adminConfig.list.limit ?? 25;

  const { db } = deps;
  const { table, fields } = adminConfig;
  const parentColumn = moduleParent
    ? getTableColumns(table)[moduleParent.foreignKey]
    : undefined;
  if (moduleParent && !parentColumn) {
    return {
      status: "error",
      message: "This list is not configured for parent records.",
    } as const;
  }

  const listSelect = getListSelect(table, fields);
  if (!Object.keys(listSelect).length) {
    return {
      status: "error",
      message: "This admin config has no list columns.",
    } as const;
  }

  const whereClause = and(
    ...resolveListWhere(
      {
        fields,
        filters: adminConfig.list.filters,
        table,
      },
      data,
    ),
    moduleParent && parentId && parentColumn
      ? eq(parentColumn, parentId)
      : undefined,
  );
  const query = db
    .select({
      id: table.id,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
      ...listSelect,
      ...(adminConfig.list.select ?? {}),
    })
    .from(table)
    .where(whereClause)
    .orderBy(
      ...resolveListOrderBy(
        {
          sort: adminConfig.list.sort,
          table,
        },
        data,
      ),
    );
  const [rows, [{ count }]] = await Promise.all([
    isReorderSort ? query : query.limit(limit).offset((data.page - 1) * limit),
    db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(table)
      .where(whereClause),
  ]);

  return {
    status: "success",
    items: rows.map(serializeAdminListItem),
    total: count,
  } as const;
}

export async function loadAdminListNeighbors({
  adminConfig,
  id,
  moduleParent,
  parentId,
  queryString,
}: {
  adminConfig: AdminListConfig;
  id: number;
  moduleParent?: ModuleParentOptions;
  parentId?: number;
  queryString: string;
}) {
  if ((moduleParent && !parentId) || (!moduleParent && parentId)) {
    return {
      previousId: null,
      nextId: null,
    };
  }

  const data = parseListSearchParams({
    filters: adminConfig.list.filters,
    searchParams: searchParamsToRecord(new URLSearchParams(queryString)),
    sort: adminConfig.list.sort,
  });
  const { db } = deps;
  const { table } = adminConfig;
  const parentColumn = moduleParent
    ? getTableColumns(table)[moduleParent.foreignKey]
    : undefined;
  if (moduleParent && !parentColumn) {
    return {
      previousId: null,
      nextId: null,
    };
  }

  const orderBy = resolveListOrderBy(
    {
      sort: adminConfig.list.sort,
      table,
    },
    data,
  );
  const ordered = db.$with("admin_list_neighbors").as(
    db
      .select({
        id: table.id,
        previousId: sql<
          number | null
        >`lag(${table.id}) over (order by ${sql.join(orderBy, sql`, `)})`.as(
          "previous_id",
        ),
        nextId: sql<
          number | null
        >`lead(${table.id}) over (order by ${sql.join(orderBy, sql`, `)})`.as(
          "next_id",
        ),
      })
      .from(table)
      .where(
        and(
          ...resolveListWhere(
            {
              fields: adminConfig.fields,
              filters: adminConfig.list.filters,
              table,
            },
            data,
          ),
          moduleParent && parentId && parentColumn
            ? eq(parentColumn, parentId)
            : undefined,
        ),
      ),
  );
  const [row] = await db
    .with(ordered)
    .select({
      previousId: ordered.previousId,
      nextId: ordered.nextId,
    })
    .from(ordered)
    .where(eq(ordered.id, id))
    .limit(1);

  return {
    previousId: row?.previousId ?? null,
    nextId: row?.nextId ?? null,
  };
}

export async function listWhere<TTable extends AdminContentTable>(
  table: TTable,
  options: { draft?: boolean } = {},
) {
  if (options.draft) {
    await deps.auth.requireUser("admin");
    return isNull(table.deletedAt);
  }

  return and(
    isNull(table.deletedAt),
    eq(table.visibility, "published"),
    lte(table.publishedAt, sql`now()`),
  );
}

function getListSelect(
  table: AnyAdminConfig["table"],
  fields: AnyAdminConfig["fields"],
) {
  const columns = getTableColumns(table);
  const select: Record<string, (typeof columns)[keyof typeof columns] | SQL> =
    {};

  for (const [key, field] of Object.entries(fields)) {
    if (!field.list) {
      continue;
    }

    const column = columns[key];
    const fieldSelect = field.listSelect?.({
      key,
      field,
      column,
      columns,
    });

    if (fieldSelect || column) {
      select[key] = fieldSelect ?? column;
    }
  }

  if (!Object.keys(select).length) {
    if ("title" in columns) {
      select.title = columns.title;
    }

    if ("publishedAt" in columns) {
      select.publishedAt = columns.publishedAt;
    }
  }

  if ("visibility" in columns) {
    select.visibility ??= columns.visibility;
  }

  return select;
}

function serializeAdminListItem(values: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, serializeValue(value)]),
  ) as BaseListItem & Record<string, unknown>;
}

function serializeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item)]),
    );
  }

  return value;
}
