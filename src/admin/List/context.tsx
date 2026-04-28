"use client";

import React, { createContext, useContext, useState } from "react";
import { useSearchParams } from "next/navigation";

const AdminListContext = createContext<UseListProps | null>(null);
import fetcher from "@kenstack/lib/fetcher";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import useQueryStore, { type SetQueryStore } from "./useQueryStore";

type FilterProps = {
  keywords: string;
  filters: Record<string, unknown>;
};

import { AdminClient, type AdminListResult } from "@kenstack/admin/client";

type AdminListProps = {
  client: AdminClient;
  userId: number;
  name: string;
  children: React.ReactNode;
};

type QueryKey = [string, string, FilterProps, number];

type UseListProps<TDoc extends Record<string, unknown> = never> = {
  client: AdminClient;
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
  children,
}: AdminListProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [filters, debouncedFilters, setFilters] = useQueryStore<FilterProps>({
    keywords: "",
    // filters: admin.filters ? admin.filters.defaultValues : {},
    filters: {},
  });

  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? 1);

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

export function useAdminList() {
  const context = useContext(AdminListContext);
  if (context === null) {
    throw new Error("useAdminList must be used within an AdminListProvider");
  }
  // type Doc = z.infer<typeof context.adminConfig.schema>
  return context as UseListProps;
}
