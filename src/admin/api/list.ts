import {
  sql,
  desc,
  asc,
  getTableColumns,
  arrayOverlaps,
  isNull,
  isNotNull,
  and,
  eq,
  gte,
  inArray,
  lte,
  or,
  ilike,
  not,
  type SQL,
} from "drizzle-orm";

import { pipelineStage } from "@kenstack/api";
import type {
  AdminFilters,
  AnyAdminTableConfig,
  SortDirection,
} from "@kenstack/admin";
import { createListRequestSchema } from "@kenstack/admin/lib/listQuerySchema";

import { deps } from "@app/deps";

export const listAction = (adminConfig: AnyAdminTableConfig) =>
  pipelineStage(
    {
      role: "admin",
      schema: createListRequestSchema({
        filters: adminConfig.filters,
        sort: adminConfig.sort,
      }),
    },
    async ({ response, data }) => {
      const { keywords, page, trash } = data;
      const limit = adminConfig.limit || 25;
      const offset = (page - 1) * limit;

      const { db } = deps;
      const { table, fields } = adminConfig;

      const searchable = Object.entries(fields)
        .filter(([, field]) => "searchable" in field && field.searchable)
        .map(([key]) => key);

      const where = [
        trash ? isNotNull(table.deletedAt) : isNull(table.deletedAt),
        ...resolveFilters(adminConfig.filters, data.filters),
      ];

      if (keywords && searchable.length) {
        const searchConditions = searchable
          .filter(
            (key): key is Extract<keyof typeof table, string> => key in table,
          )
          .map((key) => ilike(sql`${table[key]}`, `%${keywords}%`));

        if (searchConditions.length === 1) {
          where.push(searchConditions[0]);
        } else if (searchConditions.length > 1) {
          where.push(or(...searchConditions) ?? searchConditions[0]);
        }
      }

      const listSelect = getListSelect(table, fields);
      if (!Object.keys(listSelect).length) {
        return response.error("This admin config has no list columns.");
      }

      const whereClause = and(...where);
      const [rows, [{ count }]] = await Promise.all([
        db
          .select({
            id: table.id,
            createdAt: table.createdAt,
            updatedAt: table.updatedAt,
            ...listSelect,
            ...adminConfig.select,
          })
          .from(table)
          .where(whereClause)
          .orderBy(...resolveOrderBy(adminConfig, data.sort, data.direction))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql`count(*)`.mapWith(Number) })
          .from(table)
          .where(whereClause),
      ]);

      return response.success({ total: count, items: rows });
    },
  );

function getListSelect(
  table: AnyAdminTableConfig["table"],
  fields: AnyAdminTableConfig["fields"],
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

    if ("visibility" in columns) {
      select.visibility = columns.visibility;
    }

    if ("publishedAt" in columns) {
      select.publishedAt = columns.publishedAt;
    }
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
  const options = new Set(filter.options.map(([value]) => value));
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

function resolveOrderBy(
  adminConfig: AnyAdminTableConfig,
  requestedSort: string | undefined,
  requestedDirection: SortDirection | undefined,
) {
  const { sort, table } = adminConfig;
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
