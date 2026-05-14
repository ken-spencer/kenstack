import * as z from "zod";
import {
  sql,
  desc,
  asc,
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

import { pipeline, pipelineStage } from "@kenstack/lib/api";
import type {
  AdminApiOptions,
  AdminFilters,
  AdminSortField,
  AnyAdminTable,
  SortDirection,
} from "@kenstack/admin";

import { deps } from "@app/deps";

const maxTextFilterLength = 200;
const maxDateFilterLength = 64;
const maxListPage = 10000;

const list = ({ adminTable, ...options }: AdminApiOptions) => {
  return pipeline(options, [listAction(adminTable)]);
};

const listAction = (adminTable: AnyAdminTable) =>
  pipelineStage(
    { schema: getListSchema(adminTable) },
    async ({ response, data }) => {
      const { keywords, page, trash } = data;
      const limit = adminTable.limit || 25;
      const offset = (page - 1) * limit;

      const { db } = deps;
      const { table, fields } = adminTable;

      const searchable = Object.entries(fields)
        .filter(([, field]) => "searchable" in field && field.searchable)
        .map(([key]) => key);

      const where = [
        trash ? isNotNull(table.deletedAt) : isNull(table.deletedAt),
      ];

      const keyword = keywords.trim();
      if (keyword && searchable.length) {
        const searchableColumns = searchable
          .filter(
            (key): key is Extract<keyof typeof table, string> => key in table,
          )
          .map((key) => table[key]);

        const searchConditions = searchableColumns.map((column) => {
          return ilike(sql`${column}`, `%${keyword}%`);
        });

        where.push(or(...searchConditions)!);
      }

      where.push(...resolveFilters(adminTable.filters, data.filters));

      const rows = await db
        .select({
          id: table.id,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
          ...adminTable.select,
        })
        .from(table)
        .where(and(...where))
        .orderBy(...resolveOrderBy(adminTable, data.sort, data.direction))
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql`count(*)`.mapWith(Number) })
        .from(table)
        .where(and(...where));

      return response.success({ total: count, items: rows });
    },
  );

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
        if (range?.from) {
          where.push(gte(filter.field, range.from));
        }
        if (range?.to) {
          where.push(lte(filter.field, range.to));
        }
        break;
      }
      case "boolean": {
        const value = parseBoolean(rawValue);
        if (value !== null) {
          where.push(eq(filter.field, value));
        }
        break;
      }
      case "enum": {
        const selected = parseOptionFilterValue(rawValue);
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
        const selected = parseOptionFilterValue(rawValue);
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

function getListSchema(adminTable: AnyAdminTable) {
  const sortNames = Object.keys(adminTable.sort);

  return z.object({
    keywords: z.string().max(maxTextFilterLength).catch(""),
    trash: z.preprocess(parseBooleanInput, z.boolean()).catch(false),
    sort: z
      .string()
      .refine((value) => sortNames.includes(value))
      .optional(),
    direction: z.enum(["asc", "desc"]).optional(),
    filters: getFiltersSchema(adminTable.filters).catch({}),
    page: z.coerce.number().int().positive().max(maxListPage).catch(1),
  });
}

function getFiltersSchema(filters: AdminFilters) {
  return z
    .object(
      Object.fromEntries(
        Object.entries(filters).map(([name, filter]) => [
          name,
          getFilterSchema(filter),
        ]),
      ),
    )
    .partial()
    .strip()
    .transform(compactFilterValues);
}

function getFilterSchema(filter: AdminFilters[string]) {
  return z.unknown().transform((value) => sanitizeFilterValue(filter, value));
}

function sanitizeFilterValue(filter: AdminFilters[string], value: unknown) {
  switch (filter.kind) {
    case "date-range": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
      }

      const range = value as { from?: unknown; to?: unknown };
      const next = {
        from: sanitizeDateInput(range.from),
        to: sanitizeDateInput(range.to),
      };
      return hasFilterValue(next) ? next : undefined;
    }
    case "boolean":
      return parseBoolean(value) ?? undefined;
    case "enum":
    case "includes":
      return sanitizeOptionFilterValue(filter, value);
    case "text":
      return sanitizeTextInput(value);
  }
}

function sanitizeDateInput(value: unknown) {
  return typeof value === "string" && value.length <= maxDateFilterLength
    ? value
    : undefined;
}

function sanitizeTextInput(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxTextFilterLength ? value : undefined;
}

function sanitizeOptionFilterValue(
  filter: Extract<AdminFilters[string], { kind: "enum" | "includes" }>,
  value: unknown,
) {
  const options = new Set(filter.options.map(([value]) => value));

  if (Array.isArray(value)) {
    const next = Object.fromEntries(
      value
        .filter((option): option is string => typeof option === "string")
        .filter((option) => options.has(option))
        .map((option) => [option, "+"]),
    );
    return hasFilterValue(next) ? next : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const next = Object.fromEntries(
    Object.entries(value).filter(
      ([option, state]) =>
        options.has(option) && (state === "+" || state === "-"),
    ),
  );
  return hasFilterValue(next) ? next : undefined;
}

function compactFilterValues(filters: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => hasFilterValue(value)),
  );
}

function hasFilterValue(value: unknown) {
  if (typeof value === "boolean") {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const range = value as { from?: unknown; to?: unknown };
  if (range.from || range.to) {
    return true;
  }

  return Object.values(value).some((item) => item === "+" || item === "-");
}

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function parseOptionFilterValue(value: unknown) {
  if (Array.isArray(value)) {
    return {
      include: parseStringArray(value),
      exclude: [],
    };
  }

  if (!value || typeof value !== "object") {
    return {
      include: [],
      exclude: [],
    };
  }

  const include: string[] = [];
  const exclude: string[] = [];
  for (const [optionValue, state] of Object.entries(value)) {
    if (state === "+") {
      include.push(optionValue);
    }
    if (state === "-") {
      exclude.push(optionValue);
    }
  }

  return { include, exclude };
}

function parseTextFilter(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const exclude = trimmed.startsWith("!");
  const parsedValue = exclude ? trimmed.slice(1).trim() : trimmed;
  if (!parsedValue) {
    return null;
  }

  return {
    exclude,
    value: parsedValue,
  };
}

function parseDateRange(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const { from, to } = value as { from?: unknown; to?: unknown };

  return {
    from: parseDateValue(from),
    to: parseDateValue(to, true),
  };
}

function parseDateValue(value: unknown, endOfDay = false) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function parseBoolean(value: unknown) {
  const parsed = parseBooleanInput(value);
  return typeof parsed === "boolean" ? parsed : null;
}

function parseBooleanInput(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return value;
}

function resolveOrderBy(
  adminTable: AnyAdminTable,
  requestedSort: string | undefined,
  requestedDirection: SortDirection | undefined,
) {
  const { sort, table } = adminTable;
  const sortName =
    requestedSort && sort[requestedSort] ? requestedSort : Object.keys(sort)[0];
  const option = sort[sortName];
  const direction = requestedDirection ?? option.defaultDirection;
  const orderBy = option.fields.map((field) => {
    const column = getSortColumn(field);
    const fieldDirection = getSortDirection(field, direction);
    return fieldDirection === "asc" ? asc(column) : desc(column);
  });

  if (!option.fields.some((field) => getSortColumn(field) === table.id)) {
    orderBy.push(desc(table.id));
  }

  return orderBy;
}

function getSortColumn(field: AdminSortField) {
  return "field" in field ? field.field : field;
}

function getSortDirection(
  field: AdminSortField,
  selectedDirection: SortDirection,
) {
  return "field" in field && field.direction
    ? field.direction
    : selectedDirection;
}

export default list;
