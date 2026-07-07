"use client";

import { type ZodObject } from "zod";

import React, { createContext, use, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";

import EditForm from "./Form";
import type { AdminClient } from "@kenstack/admin/client";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import type { PreviewPath } from "@kenstack/admin/module";
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
  clients: AdminClientRegistry;
  children: React.ReactNode;
  parentId?: number;
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
  parentId?: number;
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
  clients,
  parentId,
  preview,
  children,
}: AdminEditProps) {
  const loadClientConfig = clients[name];

  if (!loadClientConfig) {
    throw new Error(`Missing admin client config for "${name}".`);
  }

  const clientConfig = use(loadClientConfig());
  const client = clientConfig.admin;
  if (!client) {
    throw new Error("Admin client config is required for admin edit routes.");
  }

  const pathname = usePathname();
  const apiPath = "/api/admin";
  const listPath = useMemo(() => {
    if (parentId) {
      return `/admin/${parentId}/${name}`;
    }

    const parts = pathname.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }, [name, parentId, pathname]);

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
    parentId,
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
