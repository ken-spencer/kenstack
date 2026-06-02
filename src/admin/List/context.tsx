"use client";

import React, { createContext, useContext, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AdminFilterMeta, AdminSortMeta } from "@kenstack/admin";
import {
  createDefaultListQueryState,
  createListQueryStoreSchema,
  parseListPage,
  type ListQueryStoreState,
} from "@kenstack/admin/lib/listQuerySchema";
import type { FetchResult } from "@kenstack/api/fetcher";

const AdminListContext = createContext<UseListProps | null>(null);
import fetcher from "@kenstack/api/fetcher";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import useQueryStore, { type SetQueryStore } from "./useQueryStore";

import type {
  AdminClient,
  BaseListItem,
  ClientConfig,
} from "@kenstack/admin/client";

type AdminListProps = {
  basePath?: string;
  clientConfig: ClientConfig;
  userId: number;
  name: string;
  sort: AdminSortMeta[];
  filter: AdminFilterMeta[];
  initialData?: AdminListQueryData;
  children: React.ReactNode;
};

type QueryKey = [string, string, ListQueryStoreState, number];

export type AdminListQueryData<
  TDoc extends Record<string, unknown> = Record<string, unknown>,
> = FetchResult<{
  total: number;
  items: (BaseListItem & TDoc)[];
}>;

type UseListProps<
  TDoc extends Record<string, unknown> = Record<string, unknown>,
> = {
  client: AdminClient;
  sort: AdminSortMeta[];
  filter: AdminFilterMeta[];
  selected: number[];
  name: string;
  basePath?: string;
  setSelected: React.Dispatch<React.SetStateAction<number[]>>;
  apiPath: string;
  queryKey: QueryKey;
  filters: ListQueryStoreState;
  setFilters: SetQueryStore<ListQueryStoreState>;
  userId: number;
  page: number;
  query: UseQueryResult<AdminListQueryData<TDoc>, Error>;
  limit: number;
};

export function AdminListProvider({
  basePath,
  clientConfig,
  userId,
  name,
  sort,
  filter,
  initialData,
  children,
}: AdminListProps) {
  const client = clientConfig.admin;
  if (!client) {
    throw new Error("Admin client config is required for admin list routes.");
  }

  const [selected, setSelected] = useState<number[]>([]);
  const defaultFilterState = createDefaultListQueryState(sort);
  const [filters, debouncedFilters, setFilters] =
    useQueryStore<ListQueryStoreState>(defaultFilterState, {
      schema: createListQueryStoreSchema({
        filters: filter,
        sort,
        defaults: defaultFilterState,
      }),
    });

  const searchParams = useSearchParams();
  const page = parseListPage(searchParams.get("page"));

  const apiPath = "/api/admin/";

  const queryKey = [
    "admin-list",
    name,
    debouncedFilters,
    page,
  ] satisfies QueryKey;

  const query = useQuery({
    queryFn: () =>
      fetcher<{
        total: number;
        items: (BaseListItem & Record<string, unknown>)[];
      }>(apiPath, {
        action: "list",
        name,
        ...debouncedFilters,
        page,
      }),
    queryKey,
    initialData,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const values: UseListProps = {
    client,
    basePath,
    sort,
    filter,
    name,
    selected,
    setSelected,
    apiPath,
    queryKey,
    filters,
    setFilters,
    userId,
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

export function useAdminList() {
  const context = useContext(AdminListContext);
  if (context === null) {
    throw new Error("useAdminList must be used within an AdminListProvider");
  }
  return context as UseListProps;
}
