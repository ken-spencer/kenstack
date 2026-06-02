import * as z from "zod";

import type {
  AdminFilters,
  AdminFilterMeta,
  AdminSort,
  AdminSortMeta,
  SortDirection,
} from "../types/list";
import { getFilterMeta, getSortMeta } from "../types/list";

const maxTextFilterLength = 200;
const maxDateFilterLength = 64;

export type ListQueryStoreState = {
  keywords: string;
  trash: boolean;
  sort: string;
  direction: SortDirection;
  filters: Record<string, unknown>;
};

export function createDefaultListQueryState(sort: AdminSortMeta[]) {
  const defaultSort = sort[0];

  return {
    keywords: "",
    trash: false,
    sort: defaultSort?.name ?? "createdAt",
    direction: defaultSort?.defaultDirection ?? "desc",
    filters: {},
  } satisfies ListQueryStoreState;
}

export function parseListPage(value: string | string[] | null | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const page = Number(rawValue ?? 1);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function createListQueryStoreSchema({
  filters,
  sort,
  defaults,
}: {
  filters: AdminFilterMeta[];
  sort: AdminSortMeta[];
  defaults: ListQueryStoreState;
}) {
  const sortNames = sort.map((option) => option.name);

  return z
    .object({
      keywords: getKeywordSchema(defaults.keywords),
      trash: getBooleanSchema(defaults.trash),
      sort: getSortSchema(sortNames, defaults.sort),
      direction: getDirectionSchema(defaults.direction),
      filters: getFilterObjectSchema(filters),
    })
    .transform((value) => ({
      keywords: value.keywords ?? defaults.keywords,
      trash: value.trash ?? defaults.trash,
      sort: value.sort ?? defaults.sort,
      direction: value.direction ?? defaults.direction,
      filters: value.filters ?? defaults.filters,
    }));
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
  const sortNames = sortMeta.map((option) => option.name);

  return z.object({
    keywords: getKeywordSchema(""),
    trash: getBooleanSchema(false),
    sort: getSortSchema(sortNames),
    direction: getDirectionSchema(),
    filters: getFilterObjectSchema(filterMeta),
    page: z.coerce.number().int().positive().max(10000).catch(1),
  });
}

function getKeywordSchema(defaultValue: string) {
  return z
    .string()
    .max(maxTextFilterLength)
    .transform((value) => value.trim())
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
        .preprocess(parseBooleanInput, z.boolean())
        .optional()
        .catch(undefined);
    case "enum":
    case "includes":
      return z
        .union([z.array(z.string()), z.record(z.string(), z.enum(["+", "-"]))])
        .optional()
        .catch(undefined);
    case "text":
      return z.string().max(maxTextFilterLength).optional().catch(undefined);
  }
}

function getDateFilterDateSchema() {
  return z.string().max(maxDateFilterLength).optional().catch(undefined);
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
