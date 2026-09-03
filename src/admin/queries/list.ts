import { and, eq, getTableColumns, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import isEqual from "lodash-es/isEqual";

import { db } from "@app/db";
import { modules } from "@app/modules";
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
import { getSortMeta } from "@kenstack/admin/types/list";
import { resolveListOrderBy, resolveListWhere } from "@kenstack/list/server";
import {
  applyListJoins,
  getListSelect,
  resolveOneToOneList,
} from "./listRelations";
import { serializeValues } from "./serialize";

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

  if (isDefaultListQuery(adminConfig, query)) {
    return {
      data: await loadCachedList(name),
    };
  }

  return {
    data: await queryAdminList({ adminConfig, query }),
  };
}

async function loadCachedList(name: string) {
  "use cache";
  cacheLife("max");
  cacheTag("admin", adminListCacheTag(name));

  const adminConfig = modules[name]?.admin;

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

function isDefaultListQuery(adminConfig: AdminListConfig, query: ListQuery) {
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

  const related = resolveOneToOneList(adminConfig);
  const listSelect = {
    ...getListSelect(table, fields),
    ...related.select,
  };
  const searchable = [
    ...getListSearchable(table, fields),
    ...related.searchable,
  ];
  if (!Object.keys(listSelect).length) {
    return {
      status: "error",
      message: "This admin config has no list columns.",
    } as const;
  }

  const whereClause = and(
    ...resolveListWhere(
      {
        filters: adminConfig.list.filters,
        searchable,
        table,
      },
      data,
    ),
    moduleParent && parentId && parentColumn
      ? eq(parentColumn, parentId)
      : undefined,
  );
  const query = applyListJoins(
    db
      .select({
        id: table.id,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        ...listSelect,
        ...(adminConfig.list.select ?? {}),
      })
      .from(table)
      .$dynamic(),
    related.joins,
  )
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
    applyListJoins(
      db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(table)
        .$dynamic(),
      related.joins,
    ).where(whereClause),
  ]);

  return {
    status: "success",
    items: rows.map((row) => serializeValues(row)),
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
  const { table, fields } = adminConfig;
  const related = resolveOneToOneList(adminConfig);
  const searchable = [
    ...getListSearchable(table, fields),
    ...related.searchable,
  ];
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
    applyListJoins(
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
        .$dynamic(),
      related.joins,
    ).where(
      and(
        ...resolveListWhere(
          {
            filters: adminConfig.list.filters,
            searchable,
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

// Collects searchable parent columns so list queries can combine them with related fields.
function getListSearchable(
  table: AnyAdminConfig["table"],
  fields: AnyAdminConfig["fields"],
) {
  const columns = getTableColumns(table);

  return Object.entries(fields)
    .filter(([, field]) => field.searchable)
    .flatMap(([name]) => {
      const column = columns[name];
      return column ? [column] : [];
    });
}
