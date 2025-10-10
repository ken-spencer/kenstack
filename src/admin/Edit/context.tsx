"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useServer } from "@kenstack/admin/Server/context";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import fetcher, { type FetchResult } from "@kenstack/lib/fetcher";
import Alert from "@kenstack/components/Alert";
import Progress from "@kenstack/components/Progress";
import EditForm from "./Form";
// import * as z from "zod";

import { type AdminClientConfig } from "@kenstack/admin/types";
type AdminEditProps = {
  adminConfig: AdminClientConfig;
  children: React.ReactNode;
};

type AdminEditContext<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  type: string;
  id: string;
  isNew: boolean;
  apiPath: string;
  listPath: string;
  adminConfig: AdminClientConfig;
  item: T;
  defaultValues: T;
};

const AdminEditContext = createContext<AdminEditContext | null>(null);

export function AdminEditProvider({ adminConfig, children }: AdminEditProps) {
  // const clientSchema =
  //   typeof adminConfig.schema === "function"
  //     ? adminConfig.schema("client")
  //     : adminConfig.schema;
  // type FormValues = z.infer<typeof clientSchema>;

  const pathname = usePathname();
  const { type, id, isNew } = useServer();
  const regex = new RegExp(`^(.*?)(?=/${type}(?:/|$)).*$`);
  const basePathname = pathname.replace(regex, "$1");
  const apiPath = basePathname + "/api/" + type;
  const listPath = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // removes empty strings
    parts.pop(); // remove last segment
    return "/" + parts.join("/");
  }, [pathname]);

  const { data, error, isPending } = useQuery<
    FetchResult<{ item: Record<string, unknown> }>
  >({
    queryFn: () => fetcher(apiPath + "/load", { id }),
    queryKey: ["admin-edit", id],
    enabled: !!id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  let defaultValues = adminConfig.defaultValues;

  if (id) {
    if (error) {
      return <Alert className="my-2">{error.message}</Alert>;
    }

    if (isPending) {
      return <Progress className="my-16" />;
    }

    if (data.status === "error") {
      return <Alert className="my-2" {...data} />;
    }
    defaultValues = data.item;
  }

  const values: AdminEditContext = {
    type,
    id,
    isNew,
    apiPath,
    listPath,
    adminConfig,
    item: id && data?.status === "success" ? data.item : null,
    defaultValues,
  };
  return (
    <AdminEditContext.Provider value={values}>
      <EditForm>{children}</EditForm>
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit<
  T extends Record<string, unknown>,
>(): AdminEditContext<T> {
  const context = useContext(AdminEditContext);
  if (context === null) {
    throw new Error("useAdminEdit must be used within an AdminEditProvider");
  }
  return context as AdminEditContext<T>;
}
