"use client";

import React, { createContext, use, useContext, useState } from "react";
import type {
  AdminFilterMeta,
  AdminSortMeta,
} from "@kenstack/admin/types/list";
import fetcher, { type FetchResult } from "@kenstack/api/fetcher";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  createDefaultListQueryState,
  createListSearchSchema,
  listQuerySearchParams,
  parseListPage,
  type ListQueryStoreState,
} from "@kenstack/list/querySchema";
import useQueryStore, {
  type SetQueryStore,
} from "@kenstack/list/useQueryStore";

import type { AdminClient, BaseListItem } from "@kenstack/admin/client";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import { getAdminListQueryKey } from "./queryKey";

const AdminListContext = createContext<UseListProps | null>(null);

type AdminListProps = {
  basePath?: string;
  clients: AdminClientRegistry;
  name: string;
  parentId?: number;
  sort: AdminSortMeta[];
  filter: AdminFilterMeta[];
  children: React.ReactNode;
};

type AdminListPayload = {
  total: number;
  limit: number;
  items: (BaseListItem & Record<string, unknown>)[];
};

export type AdminListQueryData = FetchResult<AdminListPayload>;

type UseListProps = {
  client: AdminClient;
  sort: AdminSortMeta[];
  filter: AdminFilterMeta[];
  selected: number[];
  name: string;
  parentId?: number;
  basePath?: string;
  setSelected: React.Dispatch<React.SetStateAction<number[]>>;
  apiPath: string;
  queryKey: ReturnType<typeof getAdminListQueryKey>;
  filters: ListQueryStoreState;
  setFilters: SetQueryStore<ListQueryStoreState>;
  page: number;
  isReorderSort: boolean;
  canReorder: boolean;
  query: UseQueryResult<AdminListQueryData, Error>;
};

export function AdminListProvider({
  basePath,
  clients,
  name,
  parentId,
  sort,
  filter,
  children,
}: AdminListProps) {
  const loadClientConfig = clients[name];

  if (!loadClientConfig) {
    throw new Error(`Missing admin client config for "${name}".`);
  }

  const clientConfig = use(loadClientConfig());
  const client = clientConfig.admin;
  if (!client) {
    throw new Error("Admin client config is required for admin list routes.");
  }

  const [selected, setSelected] = useState<number[]>([]);
  const defaultFilterState = createDefaultListQueryState(sort);
  const [filters, debouncedFilters, setFilters, searchParams] = useQueryStore(
    defaultFilterState,
    {
      schema: createListSearchSchema({
        filters: filter,
        sort,
        defaults: defaultFilterState,
      }),
      serialize: (state) =>
        listQuerySearchParams(state, {
          defaults: defaultFilterState,
          sort,
        }),
    },
  );

  const isReorderSort =
    !filters.trash &&
    sort.find((option) => option.name === filters.sort)?.direction === false;
  const page = isReorderSort ? 1 : parseListPage(searchParams.get("page"));
  const canReorder =
    isReorderSort &&
    !filters.keywords &&
    !filters.trash &&
    Object.keys(filters.filters).length === 0;

  const apiPath = "/api/admin/";

  const queryKey = getAdminListQueryKey({
    name,
    parentId,
    query: {
      ...debouncedFilters,
      page,
    },
  });

  const query = useQuery({
    queryFn: () =>
      fetcher<AdminListPayload>(apiPath, {
        action: "list",
        name,
        parentId,
        ...debouncedFilters,
        page,
      }),
    queryKey,
    refetchOnWindowFocus: "always",
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const values: UseListProps = {
    client,
    basePath,
    sort,
    filter,
    name,
    parentId,
    selected,
    setSelected,
    apiPath,
    queryKey,
    filters,
    setFilters,
    page,
    isReorderSort,
    canReorder,
    query,
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
  return context;
}
