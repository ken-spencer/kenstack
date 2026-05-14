"use client";

import React, { createContext, useContext, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AdminFilterMeta, AdminSortMeta } from "@kenstack/admin";
import * as z from "zod";

const AdminListContext = createContext<UseListProps | null>(null);
import fetcher from "@kenstack/lib/fetcher";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import useQueryStore, { type SetQueryStore } from "./useQueryStore";

type FilterProps = {
  keywords: string;
  trash: boolean;
  sort: string;
  direction: "asc" | "desc";
  filters: Record<string, unknown>;
};

import { AdminClient, type AdminListResult } from "@kenstack/admin/client";

const maxTextFilterLength = 200;
const maxDateFilterLength = 64;

type AdminListProps = {
  client: AdminClient;
  userId: number;
  name: string;
  sort: AdminSortMeta[];
  filter: AdminFilterMeta[];
  children: React.ReactNode;
};

type QueryKey = [string, string, FilterProps, number];

type UseListProps<TDoc extends Record<string, unknown> = never> = {
  client: AdminClient;
  sort: AdminSortMeta[];
  filter: AdminFilterMeta[];
  selected: number[];
  name: string;
  setSelected: React.Dispatch<React.SetStateAction<number[]>>;
  apiPath: string;
  // adminConfig: AdminClientConfig;
  queryKey: QueryKey;
  filters: FilterProps;
  setFilters: SetQueryStore<FilterProps>;
  // keywords: string;
  // setKeywords: React.Dispatch<React.SetStateAction<string>>;
  userId: number;
  page: number;
  query: UseQueryResult<AdminListResult<TDoc>, Error>;
  limit: number;
};

export function AdminListProvider({
  client,
  userId,
  name,
  sort,
  filter,
  children,
}: AdminListProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const defaultSort = sort[0];
  const defaultFilterState = {
    keywords: "",
    trash: false,
    sort: defaultSort?.name ?? "createdAt",
    direction: defaultSort?.defaultDirection ?? "desc",
    filters: {},
  } satisfies FilterProps;
  const [filters, debouncedFilters, setFilters] = useQueryStore<FilterProps>(
    defaultFilterState,
    {
      schema: getQueryStoreSchema(filter, sort, defaultFilterState),
    },
  );

  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));

  const apiPath = "/api/admin/";

  const queryKey = [
    "admin-list",
    name,
    debouncedFilters,
    page,
  ] satisfies QueryKey;

  const query = useQuery({
    queryFn: () =>
      fetcher<AdminListResult>(apiPath, {
        action: "list",
        name,
        ...debouncedFilters,
        page,
      }),
    queryKey,
    placeholderData: (prev) => prev,
  });

  const values: UseListProps = {
    client,
    sort,
    filter,
    name,
    selected,
    setSelected,
    apiPath,
    // adminConfig: admin,
    queryKey,
    filters,
    setFilters,
    userId,
    // keywords,

    // setKeywords,
    page,
    query,
    limit: 25,
  };
  return (
    <AdminListContext.Provider value={values}>
      {children}
    </AdminListContext.Provider>
  );
}

function parsePage(value: string | null) {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getQueryStoreSchema(
  filters: AdminFilterMeta[],
  sort: AdminSortMeta[],
  defaults: FilterProps,
) {
  const sortNames = sort.map((option) => option.name);
  const filterSchemas = Object.fromEntries(
    filters.map((filter) => [filter.name, getClientFilterSchema(filter)]),
  );

  return z
    .object({
      keywords: z.string().catch(defaults.keywords),
      trash: z.boolean().catch(defaults.trash),
      sort: z
        .string()
        .refine((value) => sortNames.includes(value))
        .catch(defaults.sort),
      direction: z.enum(["asc", "desc"]).catch(defaults.direction),
      filters: z
        .object(filterSchemas)
        .partial()
        .transform(compactClientFilters)
        .catch({}),
    })
    .transform(
      (value) =>
        ({
          keywords: value.keywords ?? defaults.keywords,
          trash: value.trash ?? defaults.trash,
          sort: value.sort ?? defaults.sort,
          direction: value.direction ?? defaults.direction,
          filters: value.filters ?? defaults.filters,
        }) satisfies FilterProps,
    );
}

function getClientFilterSchema(filter: AdminFilterMeta) {
  return z.unknown().transform((value) => sanitizeClientFilter(filter, value));
}

function sanitizeClientFilter(filter: AdminFilterMeta, value: unknown) {
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
      return hasActiveClientFilterValue(next) ? next : undefined;
    }
    case "boolean":
      return typeof value === "boolean" ? value : undefined;
    case "enum":
    case "includes": {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
      }

      const options = new Set(filter.options?.map((option) => option.value));
      const next = Object.fromEntries(
        Object.entries(value).filter(
          ([option, state]) =>
            options.has(option) && (state === "+" || state === "-"),
        ),
      );
      return hasActiveClientFilterValue(next) ? next : undefined;
    }
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

function compactClientFilters(filters: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) =>
      hasActiveClientFilterValue(value),
    ),
  );
}

function hasActiveClientFilterValue(value: unknown) {
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

export function useAdminList() {
  const context = useContext(AdminListContext);
  if (context === null) {
    throw new Error("useAdminList must be used within an AdminListProvider");
  }
  // type Doc = z.infer<typeof context.adminConfig.schema>
  return context as UseListProps;
}
