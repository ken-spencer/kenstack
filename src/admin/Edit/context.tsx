"use client";

import { type ZodObject } from "zod";

import React, { createContext, use, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";

import type { AdminClient } from "@kenstack/admin/client";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import { pickMetaFields } from "@kenstack/admin/metaFields";
import type { PreviewPath } from "@kenstack/admin/module";
import type { AdminEditItem } from "@kenstack/admin/queries/load";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";

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
  childModuleLinks?: React.ReactNode;
  oneToOne?: OneToOneEdit;
  // The table flags from defineTable({ publish, seo }).
  publish: boolean;
  seo: boolean;
};

export type OneToOneEdit = {
  field: string;
  relations: {
    name: string;
    title: string;
    value: string;
    defaultValues: Record<string, unknown>;
  }[];
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
  hasPublicationControl: boolean;
  hasSeoDialog: boolean;
  preview?: PreviewPath;
  childModuleLinks?: React.ReactNode;
  oneToOne?: OneToOneEdit;
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
  childModuleLinks,
  oneToOne,
  publish,
  seo,
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
  const listPath = useMemo(() => {
    if (parentId) {
      return `/admin/${parentId}/${name}`;
    }

    const parts = pathname.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }, [name, parentId, pathname]);

  const schema = useMemo(
    () =>
      createSchemaFromFields(
        { ...client.fields, ...pickMetaFields({ publish, seo }) },
        client.oneToOne,
      ),
    [client, publish, seo],
  );

  const context: AdminEditContext = {
    name,
    client,
    id: item?.id ?? (typeof id === "number" ? id : undefined),
    isNew,
    single,
    canUpload,
    apiPath: "/api/admin",
    listPath,
    userId,
    item,
    defaultValues: item ?? defaultValues,
    parentId,
    schema,
    hasPublicationControl: publish,
    hasSeoDialog: seo,
    preview,
    childModuleLinks,
    oneToOne,
  };
  return (
    <AdminEditContext.Provider value={context}>
      {children}
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
