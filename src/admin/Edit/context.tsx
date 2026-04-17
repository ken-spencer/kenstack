"use client";

import { type ZodObject } from "zod";

import React, { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import fetcher from "@kenstack/lib/fetcher";
import Alert from "@kenstack/components/Alert";
import Progress from "@kenstack/components/Progress";
import EditForm from "./Form";
import { AdminClient, PreviewPath } from "..";

type AdminEditProps = {
  name: string;
  id?: number;
  isNew: boolean;
  userId: number;
  defaultValues: Record<string, unknown>;
  client: AdminClient;
  children: React.ReactNode;
  preview?: PreviewPath;
};

type EditItem = { id: number; createdAt: string; updatedAt: string } & Record<
  string,
  unknown
>;

type AdminEditContext = {
  name: string;
  client: AdminClient;
  id?: number;
  isNew: boolean;
  userId: number;
  apiPath: string;
  listPath: string;
  item: null | EditItem;
  defaultValues: Record<string, unknown>;
  schema: ZodObject;
  preview?: PreviewPath;
};

const AdminEditContext = createContext<AdminEditContext | null>(null);

export function AdminEditProvider({
  name,
  id,
  isNew,
  userId,
  defaultValues,
  client,
  preview,
  children,
}: AdminEditProps) {
  const pathname = usePathname();
  const apiPath = "/api/admin";
  const listPath = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean); // removes empty strings
    parts.pop(); // remove last segment
    return "/" + parts.join("/");
  }, [pathname]);

  const { data, error, isPending } = useQuery({
    queryFn: () =>
      fetcher<{ item: EditItem }>(apiPath, {
        name,
        action: "load",
        id,
      }),
    queryKey: ["admin-edit", id],
    enabled: !!id,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

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
    name,
    client,
    id,
    isNew,
    apiPath,
    listPath,
    userId: userId,
    item: id && data?.status === "success" ? data.item : null,
    defaultValues,
    schema: client.schema,
    preview,
  };
  return (
    <AdminEditContext.Provider value={values}>
      <EditForm>{children}</EditForm>
    </AdminEditContext.Provider>
  );
}

export function useAdminEdit() {
  const context = useContext(AdminEditContext);
  if (context === null) {
    throw new Error("useAdminEdit must be used within an AdminEditProvider");
  }
  return context;
}
