import {
  asc,
  desc,
  eq,
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

import type { AdminTable } from "@kenstack/admin/table";
import type {
  AdminFilterField,
  AdminFilters,
  AdminSort,
  SortDirection,
} from "@kenstack/admin/types/list";
import { getFilterMeta, getSortMeta } from "@kenstack/admin/types/list";
import type { ServerDefinedFields } from "@kenstack/fields/server";

import {
  createDefaultListQueryState,
  createListQueryStoreSchema,
  parseListPage,
  type ListQueryStoreState,
} from "./querySchema";

export type ListSearchParams = Record<string, string | string[] | undefined>;

export type ListQuery = ListQueryStoreState & {
  filtersDefaulted?: boolean;
  page: number;
};

export type ListConfig = {
  table: AdminTable;
  fields: ServerDefinedFields;
  filters: AdminFilters;
  sort: AdminSort;
};

export function parseListSearchParams({
  defaults: defaultOverrides,
  filters,
  searchParams,
  sort,
}: {
  defaults?: Partial<ListQueryStoreState>;
  filters: AdminFilters;
  searchParams: ListSearchParams;
  sort: AdminSort;
}): ListQuery {
  const filterMeta = getFilterMeta(filters);
  const sortMeta = getSortMeta(sort);
  const defaults = createDefaultListQueryState(sortMeta, defaultOverrides);
  const values = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => [
      key,
      parseSearchParamValue(searchParams[key], fallback),
    ]),
  );
  const flatFilterValues = collectFlatFilterValues(filters, searchParams);
  const hasFlatFilterValues = Object.keys(flatFilterValues).length > 0;

  if (!searchParams.filters && hasFlatFilterValues) {
    values.filters = flatFilterValues;
  }

  const parsed = createListQueryStoreSchema({
    defaults,
    filters: filterMeta,
    sort: sortMeta,
  }).safeParse(values);
  const state = parsed.success ? parsed.data : defaults;

  return {
    ...state,
    filtersDefaulted: !searchParams.filters && !hasFlatFilterValues,
    page: parseListPage(searchParams.page),
  };
}

function parseSearchParamValue(
  value: string | string[] | undefined,
  fallback: unknown,
) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (typeof rawValue !== "string" || !rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return rawValue;
  }
}

function collectFlatFilterValues(
  filters: AdminFilters,
  searchParams: ListSearchParams,
) {
  const values: Record<string, unknown> = {};

  for (const [name, filter] of Object.entries(filters)) {
    const rawValue = searchParams[name];
    const value = Array.isArray(rawValue)
      ? rawValue
      : rawValue
        ? [rawValue]
        : [];

    if (!value.length) {
      continue;
    }

    switch (filter.kind) {
      case "enum":
      case "includes":
        values[name] = value;
        break;
      case "boolean":
        values[name] = value[0];
        break;
      case "date-range":
      case "text":
        values[name] = value[0];
        break;
    }
  }

  return values;
}

export function resolveListWhere(
  { fields, filters, table }: Pick<ListConfig, "fields" | "filters" | "table">,
  data: Pick<ListQueryStoreState, "filters" | "keywords" | "trash">,
) {
  const { keywords, trash } = data;
  const searchable = Object.entries(fields)
    .filter(([, field]) => field.searchable)
    .map(([key]) => key);
  const where = [
    trash ? isNotNull(table.deletedAt) : isNull(table.deletedAt),
    ...resolveFilters(filters, data.filters),
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
          where.push(gte(filterFieldSql(filter.field), range.from));
        }
        if (range.to) {
          where.push(lte(filterFieldSql(filter.field), range.to));
        }
        break;
      }
      case "boolean": {
        if (typeof rawValue === "boolean") {
          where.push(eq(filterFieldSql(filter.field), rawValue));
        }
        break;
      }
      case "enum": {
        const selected = parseOptionFilterValue(filter, rawValue);
        if (selected.include.length === 1) {
          where.push(eq(filterFieldSql(filter.field), selected.include[0]));
        } else if (selected.include.length > 1) {
          where.push(inArray(filterFieldSql(filter.field), selected.include));
        }
        if (selected.exclude.length > 0) {
          where.push(
            not(inArray(filterFieldSql(filter.field), selected.exclude)),
          );
        }
        break;
      }
      case "includes": {
        const selected = parseOptionFilterValue(filter, rawValue);
        if (selected.include.length > 0) {
          where.push(arrayOverlapsValues(filter.field, selected.include));
        }
        if (selected.exclude.length > 0) {
          where.push(not(arrayOverlapsValues(filter.field, selected.exclude)));
        }
        break;
      }
      case "text": {
        const filterText = parseTextFilter(rawValue);
        if (filterText) {
          const condition = ilike(
            sql`${filterFieldSql(filter.field)}`,
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

function filterFieldSql(field: AdminFilterField) {
  return field as unknown as SQL;
}

function arrayOverlapsValues(field: AdminFilterField, values: string[]) {
  return sql`${filterFieldSql(field)} && array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;
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

export function resolveListOrderBy(
  { sort, table }: Pick<ListConfig, "sort" | "table">,
  data: Pick<ListQueryStoreState, "direction" | "sort">,
) {
  const { direction: requestedDirection, sort: requestedSort } = data;
  const sortName =
    requestedSort && sort[requestedSort] ? requestedSort : Object.keys(sort)[0];
  const option = sort[sortName];
  const direction: SortDirection =
    requestedDirection ?? option.defaultDirection;
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
