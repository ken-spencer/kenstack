"use client";

import { type ZodObject } from "zod";

import React, { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";

import EditForm from "./Form";
import { AdminClient, type ClientConfig, PreviewPath } from "..";
import type { AdminEditItem } from "@kenstack/admin/queries/load";

type AdminEditProps = {
  name: string;
  id?: number;
  item: AdminEditItem | null;
  isNew: boolean;
  single: boolean;
  userId: number;
  canUpload: boolean;
  defaultValues: Record<string, unknown>;
  clientConfig: ClientConfig;
  children: React.ReactNode;
  preview?: PreviewPath;
};

type AdminEditContext = {
  name: string;
  client: AdminClient;
  id?: number;
  isNew: boolean;
  single: boolean;
  userId: number;
  canUpload: boolean;
  apiPath: string;
  listPath: string;
  item: null | AdminEditItem;
  defaultValues: Record<string, unknown>;
  schema: ZodObject;
  preview?: PreviewPath;
};

const AdminEditContext = createContext<AdminEditContext | null>(null);

export function AdminEditProvider({
  name,
  id,
  item,
  isNew,
  single,
  userId,
  canUpload,
  defaultValues,
  clientConfig,
  preview,
  children,
}: AdminEditProps) {
  const client = clientConfig.admin;
  if (!client) {
    throw new Error("Admin client config is required for admin edit routes.");
  }

  const pathname = usePathname();
  const apiPath = "/api/admin";
  const listPath = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }, [pathname]);

  const values: AdminEditContext = {
    name,
    client,
    id: item?.id ?? (typeof id === "number" ? id : undefined),
    isNew,
    single,
    canUpload,
    apiPath,
    listPath,
    userId: userId,
    item,
    defaultValues: item ?? defaultValues,
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
