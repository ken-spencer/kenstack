"use client";

import { type ZodObject } from "zod";

import React, { createContext, use, useContext, useMemo } from "react";

import type { AdminClient, ModuleClient } from "@kenstack/admin/client";
import { loadAdminClient } from "@kenstack/admin/clientLoaders";
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
  client: ModuleClient | undefined;
  children: React.ReactNode;
  // Rendered on the server. AdminEdit places them inside its form, whose navigation guard their
  // links need.
  breadcrumbs: React.ReactNode;
  childModuleLinks: React.ReactNode;
  canCreate: boolean;
  parentId?: number;
  preview?: PreviewPath;
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
  oneToOne?: OneToOneEdit;
  breadcrumbs: React.ReactNode;
  childModuleLinks: React.ReactNode;
  canCreate: boolean;
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
  client,
  parentId,
  preview,
  oneToOne,
  publish,
  seo,
  breadcrumbs,
  childModuleLinks,
  canCreate,
  children,
}: AdminEditProps) {
  if (!client?.admin) {
    throw new Error(`Missing admin client config for "${name}".`);
  }
  const adminClient = use(loadAdminClient(client.admin));

  const listPath = parentId ? `/admin/${parentId}/${name}` : `/admin/${name}`;

  const schema = useMemo(
    () =>
      createSchemaFromFields(
        { ...adminClient.fields, ...pickMetaFields({ publish, seo }) },
        adminClient.oneToOne,
      ),
    [adminClient, publish, seo],
  );

  const context: AdminEditContext = {
    name,
    client: adminClient,
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
    oneToOne,
    breadcrumbs,
    childModuleLinks,
    canCreate,
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
