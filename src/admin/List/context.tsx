"use client";

import React, { createContext, useContext, useState } from "react";
import { useServer } from "@kenstack/admin/Server/context";
import { usePathname, useSearchParams } from "next/navigation";

// type BaseDoc = Record<string, unknown>;
const AdminListContext = createContext<UseListProps | null>(null);
import fetcher from "@kenstack/lib/fetcher";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import useQueryStore, { type SetQueryStore } from "./useQueryStore";

type FilterProps = {
  keywords: string;
  filters: Record<string, unknown>;
};

import { type AdminClientConfig, type AdminListResult } from "@kenstack/admin/types";
type AdminListProps = {
  admin: AdminClientConfig;
  children: React.ReactNode;
};

type QueryKey = [string, FilterProps, number];

type UseListProps<TDoc extends Record<string, unknown> = never> = {
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  apiPath: string;
  adminConfig: AdminClientConfig;
  queryKey: QueryKey;
  filters: FilterProps;
  setFilters: SetQueryStore<FilterProps>;
  // keywords: string;
  // setKeywords: React.Dispatch<React.SetStateAction<string>>;
  page: number;
  query: UseQueryResult<AdminListResult<TDoc>, Error>;
};

export function AdminListProvider({ admin, children }: AdminListProps) {
  const [selected, setSelected] = useState([]);
  const [filters, debouncedFilters, setFilters] = useQueryStore<FilterProps>({
    keywords: "",
    filters: admin.filters ? admin.filters.defaultValues : {},
  });

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get("page") ?? 1);

  const { type } = useServer();
  const regex = new RegExp(`^(.*?)(?=/${type}(?:/|$)).*$`);
  const basePathname = pathname.replace(regex, "$1");
  const apiPath = basePathname + "/api/" + type;

  const queryKey = ["admin-list", debouncedFilters, page] satisfies QueryKey;

  const query = useQuery<AdminListResult, Error>({
    queryFn: () => fetcher(apiPath + "/list", { ...debouncedFilters, page }),
    queryKey,
    placeholderData: (prev) => prev,
  });

  const values: UseListProps = {
    selected,
    setSelected,
    apiPath,
    adminConfig: admin,
    queryKey,
    filters,
    setFilters,
    // keywords,

    // setKeywords,
    page,
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
  // type Doc = z.infer<typeof context.adminConfig.schema>
  return context as UseListProps;
}
