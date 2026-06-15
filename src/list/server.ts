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
import type { ServerDefinedFields } from "@kenstack/fields/server";

import { type ListQueryStoreState } from "./querySchema";

export type ListConfig = {
  table: AdminTable;
  fields: ServerDefinedFields;
  filters: AdminFilters;
  sort: AdminSort;
};

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
          where.push(gte(sql`${filter.field}`, range.from));
        }
        if (range.to) {
          where.push(lte(sql`${filter.field}`, range.to));
        }
        break;
      }
      case "boolean": {
        if (typeof rawValue === "boolean") {
          where.push(eq(sql`${filter.field}`, rawValue));
        }
        break;
      }
      case "enum": {
        const selected = parseOptionFilterValue(filter, rawValue);
        if (selected.include.length === 1) {
          where.push(eq(sql`${filter.field}`, selected.include[0]));
        } else if (selected.include.length > 1) {
          where.push(inArray(sql`${filter.field}`, selected.include));
        }
        if (selected.exclude.length > 0) {
          where.push(not(inArray(sql`${filter.field}`, selected.exclude)));
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

function arrayOverlapsValues(field: AdminFilterField, values: string[]) {
  return sql`${field} && array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;
}

function parseDateRange(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return {
    from: parseDateValue("from" in value ? value.from : undefined),
    to: parseDateValue("to" in value ? value.to : undefined, true),
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
  const entries =
    value && typeof value === "object" && !Array.isArray(value)
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
  const exclude = trimmed.startsWith("-");
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
