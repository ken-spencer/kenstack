import * as z from "zod";
import isEqual from "lodash-es/isEqual";

import type {
  AdminFilters,
  AdminFilterMeta,
  AdminSort,
  AdminSortMeta,
  SortDirection,
} from "@kenstack/admin/types/list";
import { getFilterMeta, getSortMeta } from "@kenstack/admin/types/list";

const maxTextFilterLength = 200;
const maxDateFilterLength = 64;

export type ListSearchParams = Record<string, string | string[] | undefined>;

export type ListQueryStoreState = {
  keywords: string;
  trash: boolean;
  sort: string;
  direction: SortDirection;
  filters: Record<string, unknown>;
};

export type ListQuery = ListQueryStoreState & { page: number };

export function createDefaultListQueryState(
  sort: AdminSortMeta[],
  overrides: Partial<ListQueryStoreState> = {},
) {
  const defaultSort = sort[0];

  return {
    keywords: "",
    trash: false,
    sort: defaultSort?.name ?? "createdAt",
    direction: defaultSort?.defaultDirection ?? "desc",
    filters: {},
    ...overrides,
  } satisfies ListQueryStoreState;
}

export function searchParamsToRecord(searchParams: URLSearchParams) {
  const value: ListSearchParams = {};

  searchParams.forEach((item, key) => {
    const current = value[key];
    if (current === undefined) {
      value[key] = item;
    } else if (Array.isArray(current)) {
      current.push(item);
    } else {
      value[key] = [current, item];
    }
  });

  return value;
}

export function parseListPage(value: string | string[] | null | undefined) {
  return getPageSchema().parse(firstValue(value));
}

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

  return createListSearchParamsSchema({
    defaults,
    filters: filterMeta,
    sort: sortMeta,
  }).parse(searchParams);
}

function createListSearchParamsSchema({
  filters,
  sort,
  defaults,
}: {
  filters: AdminFilterMeta[];
  sort: AdminSortMeta[];
  defaults: ListQueryStoreState;
}) {
  return searchParamsSchema.transform((searchParams) => {
    const filterValues = parseFilters(filters, searchParams);
    const sortValue = parseSortParam(searchParams.sort, sort, defaults);
    const selectedSort = sort.find((option) => option.name === sortValue.sort);

    return {
      keywords: getKeywordSchema(defaults.keywords).parse(searchParams.q),
      trash: getBooleanSchema(defaults.trash).parse(searchParams.trash),
      ...sortValue,
      filters: Object.keys(filterValues).length
        ? filterValues
        : defaults.filters,
      page:
        selectedSort?.direction === false
          ? 1
          : getPageSchema().parse(firstValue(searchParams.page)),
    };
  });
}

export function createListSearchSchema({
  filters,
  sort,
  defaults,
}: {
  filters: AdminFilterMeta[];
  sort: AdminSortMeta[];
  defaults: ListQueryStoreState;
}) {
  return createListSearchParamsSchema({ defaults, filters, sort }).transform(
    (query) => ({
      keywords: query.keywords,
      trash: query.trash,
      sort: query.sort,
      direction: query.direction,
      filters: query.filters,
    }),
  );
}

export function listQuerySearchParams(
  query: ListQueryStoreState & { page?: number },
  {
    defaults,
    sort,
  }: {
    defaults: ListQueryStoreState;
    sort: AdminSortMeta[];
  },
) {
  const params = new URLSearchParams();

  if (query.keywords && query.keywords !== defaults.keywords) {
    params.set("q", query.keywords);
  }

  if (query.trash !== defaults.trash) {
    params.set("trash", String(query.trash));
  }

  const sortOption = sort.find((option) => option.name === query.sort);
  const sortDirection = sortOption?.defaultDirection ?? defaults.direction;
  if (sortOption?.direction === false) {
    if (query.sort !== defaults.sort) {
      params.set("sort", query.sort);
    }
  } else if (
    query.sort !== defaults.sort ||
    query.direction !== sortDirection
  ) {
    params.set(
      "sort",
      query.direction === sortDirection ? query.sort : "-" + query.sort,
    );
  }

  for (const [name, value] of Object.entries(query.filters)) {
    if (isEqual(value, defaults.filters[name])) {
      continue;
    }

    addFilterSearchParam(params, name, value);
  }

  if (query.page && query.page > 1 && sortOption?.direction !== false) {
    params.set("page", String(query.page));
  }

  return params;
}

export function createListRequestSchema({
  filters,
  sort,
}: {
  filters: AdminFilters;
  sort: AdminSort;
}) {
  const filterMeta = getFilterMeta(filters);
  const sortMeta = getSortMeta(sort);
  const defaults = createDefaultListQueryState(sortMeta);

  return z
    .object({
      keywords: getKeywordSchema(defaults.keywords),
      trash: getBooleanSchema(defaults.trash),
      sort: getSortSchema(
        sortMeta.map((option) => option.name),
        defaults.sort,
      ),
      direction: getDirectionSchema(defaults.direction),
      filters: getFilterObjectSchema(filterMeta),
      page: z.coerce.number().int().positive().max(10000).catch(1),
      parentId: z.coerce.number().int().positive().optional(),
    })
    .transform((value) => {
      const sortValue = value.sort ?? defaults.sort;
      const selectedSort = sortMeta.find((option) => option.name === sortValue);

      return {
        keywords: value.keywords ?? defaults.keywords,
        trash: value.trash ?? defaults.trash,
        sort: sortValue,
        direction:
          selectedSort?.direction === false
            ? selectedSort.defaultDirection
            : (value.direction ?? defaults.direction),
        filters: value.filters ?? defaults.filters,
        page: selectedSort?.direction === false ? 1 : value.page,
        parentId: value.parentId,
      };
    });
}

function getKeywordSchema(defaultValue: string) {
  return z
    .preprocess(
      firstValue,
      z
        .string()
        .max(maxTextFilterLength)
        .transform((value) => value.trim()),
    )
    .catch(defaultValue);
}

function getBooleanSchema(defaultValue: boolean) {
  return z.preprocess(parseBooleanInput, z.boolean()).catch(defaultValue);
}

function getSortSchema(sortNames: string[], defaultValue?: string) {
  return z
    .string()
    .refine((value) => sortNames.includes(value))
    .optional()
    .catch(defaultValue);
}

function getDirectionSchema(defaultValue?: SortDirection) {
  return z.enum(["asc", "desc"]).optional().catch(defaultValue);
}

function getPageSchema() {
  return z.coerce.number().int().positive().max(10000).catch(1);
}

function getFilterObjectSchema(filters: AdminFilterMeta[]) {
  return z
    .object(
      Object.fromEntries(
        filters.map((filter) => [filter.name, getFilterInputSchema(filter)]),
      ),
    )
    .partial()
    .strip()
    .transform((filters) =>
      Object.fromEntries(
        Object.entries(filters).filter(([, value]) => hasFilterValue(value)),
      ),
    )
    .catch({});
}

function getFilterInputSchema(filter: AdminFilterMeta) {
  switch (filter.kind) {
    case "date-range":
      return z
        .object({
          from: getDateFilterDateSchema(),
          to: getDateFilterDateSchema(),
        })
        .optional()
        .catch(undefined);
    case "boolean":
      return z
        .preprocess(parseBooleanInput, z.boolean().optional())
        .catch(undefined);
    case "enum":
    case "includes":
      return z
        .record(z.string(), z.enum(["+", "-"]))
        .optional()
        .catch(undefined);
    case "text":
      return z.string().max(maxTextFilterLength).optional().catch(undefined);
  }
}

function getDateFilterDateSchema() {
  return z.string().max(maxDateFilterLength).optional().catch(undefined);
}

export function hasFilterValue(value: unknown) {
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

function parseBooleanInput(value: unknown) {
  const rawValue = firstValue(value);

  if (typeof value === "boolean") {
    return value;
  }

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return false;
  }

  return rawValue;
}

const searchParamsSchema = z
  .object({})
  .catchall(z.union([z.string(), z.array(z.string()), z.undefined()]));

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function stringValues(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}

function parseSortParam(
  value: string | string[] | undefined,
  sort: AdminSortMeta[],
  defaults: ListQueryStoreState,
) {
  const rawValue = firstValue(value);
  const requested = typeof rawValue === "string" ? rawValue : "";
  const reversed = requested.startsWith("-");
  const sortName = reversed ? requested.slice(1) : requested;
  const option = sort.find((item) => item.name === sortName);

  if (!option) {
    return {
      sort: defaults.sort,
      direction: defaults.direction,
    };
  }

  return {
    sort: option.name,
    direction:
      option.direction === false
        ? option.defaultDirection
        : reversed
          ? flipDirection(option.defaultDirection)
          : option.defaultDirection,
  };
}

function parseFilters(
  filters: AdminFilterMeta[],
  searchParams: ListSearchParams,
) {
  return Object.fromEntries(
    filters.flatMap((filter) => {
      const value = parseFilter(filter, searchParams);
      return hasFilterValue(value) ? [[filter.name, value]] : [];
    }),
  );
}

function parseFilter(filter: AdminFilterMeta, searchParams: ListSearchParams) {
  switch (filter.kind) {
    case "date-range":
      return getFilterInputSchema(filter).parse({
        from: firstValue(searchParams[filter.name + ".from"]),
        to: firstValue(searchParams[filter.name + ".to"]),
      });
    case "boolean":
      return getFilterInputSchema(filter).parse(searchParams[filter.name]);
    case "enum":
    case "includes":
      return getFilterInputSchema(filter).parse(
        parseOptionSearchValues(filter, searchParams[filter.name]),
      );
    case "text":
      return getFilterInputSchema(filter).parse(
        firstValue(searchParams[filter.name]),
      );
  }
}

function parseOptionSearchValues(
  filter: AdminFilterMeta,
  value: string | string[] | undefined,
) {
  const options = new Set(filter.options?.map((option) => option.value));

  return Object.fromEntries(
    stringValues(value).flatMap((item) => {
      const state = item.startsWith("-") ? "-" : "+";
      const option =
        item.startsWith("-") || item.startsWith("+") ? item.slice(1) : item;

      return options.has(option) ? [[option, state]] : [];
    }),
  );
}

function addFilterSearchParam(
  params: URLSearchParams,
  name: string,
  value: unknown,
) {
  if (typeof value === "boolean" || typeof value === "string") {
    params.set(name, String(value));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const entries = Object.entries(value);
  if ("from" in value || "to" in value) {
    for (const key of ["from", "to"] as const) {
      const item = value[key as keyof typeof value];
      if (typeof item === "string" && item) {
        params.set(name + "." + key, item);
      }
    }
    return;
  }

  for (const [option, state] of entries) {
    if (state === "+") {
      params.append(name, option);
    } else if (state === "-") {
      params.append(name, "-" + option);
    }
  }
}

function flipDirection(direction: SortDirection) {
  return direction === "asc" ? "desc" : "asc";
}
