import {
  and,
  arrayOverlaps,
  asc,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { deps } from "@app/deps";
import {
  createDefaultListQueryState,
  createListQueryStoreSchema,
  parseListPage,
} from "@kenstack/admin/lib/listQuerySchema";
import type {
  AdminFilters,
  AnyAdminConfig,
  SortDirection,
} from "@kenstack/admin";
import type { BaseListItem } from "@kenstack/admin/client";
import type { AdminContentTable } from "@kenstack/admin/table";
import { getFilterMeta, getSortMeta } from "@kenstack/admin/types/list";

type AdminListSearchParams = Record<string, string | string[] | undefined>;

export type AdminListQuery = {
  keywords: string;
  trash: boolean;
  sort?: string;
  direction?: SortDirection;
  filters: Record<string, unknown>;
  page: number;
};

export type AdminListConfig = Extract<AnyAdminConfig, { list: unknown }>;

export function adminListCacheTag(name: string) {
  return `admin-list:${name}`;
}

export async function loadAdminList({
  adminConfig,
  name,
  searchParams,
}: {
  adminConfig: AdminListConfig;
  name: string;
  searchParams: AdminListSearchParams;
}) {
  if (!Object.keys(searchParams).length) {
    return loadCachedBaseAdminList(name);
  }

  return queryAdminList(
    adminConfig,
    parseAdminListSearchParams(adminConfig, searchParams),
  );
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

  return queryAdminList(adminConfig, baseListQuery);
}

export async function queryAdminList(
  adminConfig: AdminListConfig,
  data: AdminListQuery,
) {
  const { page } = data;
  const limit = adminConfig.list.limit || 25;
  const offset = (page - 1) * limit;

  const { db } = deps;
  const { table, fields } = adminConfig;
  const listSelect = getListSelect(table, fields);
  if (!Object.keys(listSelect).length) {
    return {
      status: "error",
      message: "This admin config has no list columns.",
    } as const;
  }

  const whereClause = and(...resolveListWhere(adminConfig, data));
  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: table.id,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
        ...listSelect,
        ...(adminConfig.list.select ?? {}),
      })
      .from(table)
      .where(whereClause)
      .orderBy(...resolveOrderBy(adminConfig, data))
      .limit(limit)
      .offset(offset),
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

export async function loadAdminListNeighbors(
  adminConfig: AdminListConfig,
  queryString: string,
  id: number,
) {
  const data = parseAdminListSearchParams(
    adminConfig,
    Object.fromEntries(new URLSearchParams(queryString)),
  );
  const { db } = deps;
  const { table } = adminConfig;
  const orderBy = resolveOrderBy(adminConfig, data);
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
      .where(and(...resolveListWhere(adminConfig, data))),
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
    status: "success",
    previousId: row?.previousId ?? null,
    nextId: row?.nextId ?? null,
  } as const;
}

function parseAdminListSearchParams(
  adminConfig: AdminListConfig,
  searchParams: AdminListSearchParams,
) {
  const sort = getSortMeta(adminConfig.list.sort);
  const filters = getFilterMeta(adminConfig.list.filters);
  const defaults = createDefaultListQueryState(sort);
  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const value = searchParams[key];
      const rawValue = Array.isArray(value) ? value[0] : value;

      if (typeof rawValue !== "string" || !rawValue) {
        return [key, fallback];
      }

      try {
        return [key, JSON.parse(rawValue) as unknown];
      } catch {
        return [key, fallback];
      }
    }),
  );
  const parsed = createListQueryStoreSchema({
    defaults,
    filters,
    sort,
  }).safeParse(values);
  const state = parsed.success ? parsed.data : defaults;

  return {
    ...state,
    page: parseListPage(searchParams.page),
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

function resolveListWhere(adminConfig: AdminListConfig, data: AdminListQuery) {
  const { keywords, trash } = data;
  const { table, fields } = adminConfig;
  const searchable = Object.entries(fields)
    .filter(([, field]) => "searchable" in field && field.searchable)
    .map(([key]) => key);
  const where = [
    trash ? isNotNull(table.deletedAt) : isNull(table.deletedAt),
    ...resolveFilters(adminConfig.list.filters, data.filters),
  ];

  if (keywords && searchable.length) {
    const searchConditions = searchable
      .filter((key): key is Extract<keyof typeof table, string> => key in table)
      .map((key) => ilike(sql`${table[key]}`, `%${keywords}%`));

    if (searchConditions.length === 1) {
      where.push(searchConditions[0]);
    } else if (searchConditions.length > 1) {
      where.push(or(...searchConditions) ?? searchConditions[0]);
    }
  }

  return where;
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
    const fieldSelect = field.behavior?.listSelect?.({
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

function resolveFilters(
  filters: AdminFilters,
  values: Record<string, unknown>,
) {
  const where: SQL[] = [];

  for (const [name, rawValue] of Object.entries(values)) {
    const filter = filters[name];
    if (!filter) {
      continue;
    }

    switch (filter.kind) {
      case "date-range": {
        const range = parseDateRange(rawValue);
        if (range.from) {
          where.push(gte(filter.field, range.from));
        }
        if (range.to) {
          where.push(lte(filter.field, range.to));
        }
        break;
      }
      case "boolean": {
        if (typeof rawValue === "boolean") {
          where.push(eq(filter.field, rawValue));
        }
        break;
      }
      case "enum": {
        const selected = parseOptionFilterValue(filter, rawValue);
        if (selected.include.length === 1) {
          where.push(eq(filter.field, selected.include[0]));
        } else if (selected.include.length > 1) {
          where.push(inArray(filter.field, selected.include));
        }
        if (selected.exclude.length > 0) {
          where.push(not(inArray(filter.field, selected.exclude)));
        }
        break;
      }
      case "includes": {
        const selected = parseOptionFilterValue(filter, rawValue);
        if (selected.include.length > 0) {
          where.push(arrayOverlaps(filter.field, selected.include));
        }
        if (selected.exclude.length > 0) {
          where.push(not(arrayOverlaps(filter.field, selected.exclude)));
        }
        break;
      }
      case "text": {
        const filterText = parseTextFilter(rawValue);
        if (filterText) {
          const condition = ilike(
            sql`${filter.field}`,
            `%${filterText.value}%`,
          );
          where.push(filterText.exclude ? not(condition) : condition);
        }
        break;
      }
    }
  }

  return where;
}

function parseDateRange(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const range = value as { from?: unknown; to?: unknown };

  return {
    from: parseDateValue(range.from),
    to: parseDateValue(range.to, true),
  };
}

function parseDateValue(value: unknown, endOfDay = false) {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return undefined;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function parseOptionFilterValue(
  filter: Extract<AdminFilters[string], { kind: "enum" | "includes" }>,
  value: unknown,
) {
  const options = new Set(filter.options.map((option) => option.value));
  const entries = Array.isArray(value)
    ? value
        .filter((option): option is string => typeof option === "string")
        .filter((option) => options.has(option))
        .map((option) => [option, "+"])
    : value && typeof value === "object"
      ? Object.entries(value).filter(
          ([option, state]) =>
            options.has(option) && (state === "+" || state === "-"),
        )
      : [];
  const include: string[] = [];
  const exclude: string[] = [];

  entries.forEach(([option, state]) => {
    if (state === "+") {
      include.push(option);
    } else if (state === "-") {
      exclude.push(option);
    }
  });

  return { include, exclude };
}

function parseTextFilter(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const exclude = trimmed.startsWith("!");
  const text = exclude ? trimmed.slice(1).trim() : trimmed;

  return text ? { exclude, value: text } : null;
}

function resolveOrderBy(adminConfig: AdminListConfig, data: AdminListQuery) {
  const { table } = adminConfig;
  const { sort } = adminConfig.list;
  const { direction: requestedDirection, sort: requestedSort } = data;
  const sortName =
    requestedSort && sort[requestedSort] ? requestedSort : Object.keys(sort)[0];
  const option = sort[sortName];
  const direction = requestedDirection ?? option.defaultDirection;
  const orderBy = option.fields.map((field) => {
    const column = "field" in field ? field.field : field;
    const fieldDirection =
      "field" in field && field.direction ? field.direction : direction;

    return fieldDirection === "asc" ? asc(column) : desc(column);
  });

  if (
    !option.fields.some(
      (field) => ("field" in field ? field.field : field) === table.id,
    )
  ) {
    orderBy.push(desc(table.id));
  }

  return orderBy;
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
