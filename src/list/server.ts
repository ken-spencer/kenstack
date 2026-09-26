import deps from "@app/deps";
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
  lt,
  not,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";

import type { AdminTable } from "@kenstack/admin/table";
import type {
  AdminFilterField,
  AdminFilters,
  AdminSort,
  SortDirection,
} from "@kenstack/admin/types/list";

import { type ListQueryStoreState } from "./querySchema";

export type ListConfig = {
  table: AdminTable;
  filters: AdminFilters;
  sort: AdminSort;
  searchable: (AnyColumn | SQL)[];
};

export function resolveListWhere(
  {
    filters,
    searchable,
    table,
  }: Pick<ListConfig, "filters" | "searchable" | "table">,
  data: Pick<ListQueryStoreState, "filters" | "keywords" | "trash">,
) {
  const { keywords, trash } = data;
  const where = [
    trash ? isNotNull(table.deletedAt) : isNull(table.deletedAt),
    ...resolveFilters(filters, data.filters),
  ];

  const keywordTerms = keywords.trim().split(/\s+/).filter(Boolean);
  if (keywordTerms.length && searchable.length) {
    for (const term of keywordTerms) {
      const searchConditions = searchable.map((field) =>
        ilike(sql`${field}`, `%${term}%`),
      );

      if (searchConditions.length === 1) {
        where.push(searchConditions[0]);
      } else if (searchConditions.length > 1) {
        where.push(or(...searchConditions) ?? searchConditions[0]);
      }
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
        // The list query schema admits only calendar dates (YYYY-MM-DD).
        const range =
          typeof rawValue === "object" && rawValue !== null ? rawValue : {};
        const from =
          "from" in range && typeof range.from === "string"
            ? range.from
            : undefined;
        const to =
          "to" in range && typeof range.to === "string" ? range.to : undefined;
        const field = sql`${filter.field}`;
        if (
          "columnType" in filter.field &&
          (filter.field.columnType === "PgDate" ||
            filter.field.columnType === "PgDateString")
        ) {
          if (from) where.push(gte(field, from));
          if (to) where.push(lte(field, to));
        } else {
          // A timestamp range covers whole days in the host's time zone.
          if (from) {
            where.push(
              gte(
                field,
                sql`${from}::date::timestamp at time zone ${deps.defaultTimeZone}`,
              ),
            );
          }
          if (to) {
            where.push(
              lt(
                field,
                sql`(${to}::date + interval '1 day') at time zone ${deps.defaultTimeZone}`,
              ),
            );
          }
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
        const { include, exclude } = parseOptionFilterValue(filter, rawValue);
        const field = sql`${filter.field}`;
        // An empty option stands for no value, which a nullable column stores
        // as NULL; comparisons alone never match or exclude NULL.
        const isBlank = sql`(${field} is null or ${field} = '')`;
        const includedValues = include.filter(Boolean);
        const excludedValues = exclude.filter(Boolean);
        const matches = [
          ...(include.includes("") ? [isBlank] : []),
          ...(includedValues.length ? [inArray(field, includedValues)] : []),
        ];
        if (matches.length) {
          where.push(sql`(${sql.join(matches, sql` or `)})`);
        }
        if (excludedValues.length) {
          where.push(
            sql`(${field} is null or ${not(inArray(field, excludedValues))})`,
          );
        }
        if (exclude.includes("")) {
          where.push(not(isBlank));
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
  const direction =
    option.direction === false
      ? option.defaultDirection
      : (requestedDirection ?? option.defaultDirection);
  return resolveListSortFields(table, option, direction).map(
    ({ field, direction }) => (direction === "asc" ? asc(field) : desc(field)),
  );
}

// Exposes the canonical ID tie-break policy to server features that compose list ordering.
export function resolveListSortFields(
  table: AdminTable,
  option: AdminSort[string],
  direction: SortDirection,
): { field: AnyColumn | SQL; direction: SortDirection }[] {
  const fields = option.fields.map((field) => {
    const column = "field" in field ? field.field : field;
    const fieldDirection =
      "field" in field && field.direction ? field.direction : direction;

    return { field: column, direction: fieldDirection };
  });

  if (fields.some(({ field }) => field === table.id)) {
    return fields;
  }

  return [
    ...fields,
    {
      field: table.id,
      direction: option.direction === false ? "asc" : "desc",
    },
  ];
}
