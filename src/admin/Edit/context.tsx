"use client";

import { type ZodObject } from "zod";
import omitBy from "lodash-es/omitBy";

import React, { createContext, use, useContext, useMemo } from "react";

import type { AdminClient, ModuleClient } from "@kenstack/admin/client";
import { loadAdminClient } from "@kenstack/admin/clientLoaders";
import type { loadFieldAccess } from "@kenstack/admin/lib/fieldAccess";
import type { Permissions } from "@kenstack/admin/lib/moduleAccess";
import { pickMetaFields } from "@kenstack/admin/metaFields";
import type { PreviewPath } from "@kenstack/admin/module";
import type { AdminEditItem } from "@kenstack/admin/queries/load";
import { createSchemaFromFields } from "@kenstack/fields/createSchemaFromFields";
import { FieldAccessContext } from "@kenstack/forms/fieldAccess";

type AdminEditProps = {
  name: string;
  id?: number;
  item: AdminEditItem | null;
  isNew: boolean;
  single: boolean;
  userId: number;
  // The signed-in person's roles, set on the server, for controls only some roles may use, such as
  // switching to a user.
  userRoles: readonly string[];
  canUpload: boolean;
  defaultValues: Record<string, unknown>;
  client: ModuleClient | undefined;
  children: React.ReactNode;
  // Rendered on the server. AdminEdit places them inside its form, whose navigation guard their
  // links need.
  breadcrumbs: React.ReactNode;
  childModuleLinks: React.ReactNode;
  // Whether New shows: the module creates records and the person can edit.
  canCreate: boolean;
  permissions: Permissions;
  // Fields the person's roles leave out (hidden) or can't change here (locked), by name.
  fieldAccess: Awaited<ReturnType<typeof loadFieldAccess>>;
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
  userRoles: readonly string[];
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
  permissions: Permissions;
};

const AdminEditContext = createContext<AdminEditContext | null>(null);

export function AdminEditProvider({
  name,
  id,
  item,
  isNew,
  single,
  userId,
  userRoles,
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
  permissions,
  fieldAccess,
  children,
}: AdminEditProps) {
  if (!client?.admin) {
    throw new Error(`Missing admin client config for "${name}".`);
  }
  const adminClient = use(loadAdminClient(client.admin));

  const listPath = parentId ? `/admin/${parentId}/${name}` : `/admin/${name}`;

  // A field the person can't see is neither held nor checked; the save leaves it as it is.
  const schema = useMemo(
    () =>
      createSchemaFromFields(
        omitBy(
          { ...adminClient.fields, ...pickMetaFields({ publish, seo }) },
          (_, field) => fieldAccess[field] === "hidden",
        ),
        adminClient.oneToOne,
      ),
    [adminClient, publish, seo, fieldAccess],
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
    userRoles,
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
    permissions,
  };
  return (
    <AdminEditContext.Provider value={context}>
      <FieldAccessContext value={fieldAccess}>{children}</FieldAccessContext>
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
