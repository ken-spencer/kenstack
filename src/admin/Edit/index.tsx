import { AdminEditProvider } from "./context";
import EditBody from "./Body";
import Breadcrumbs from "@kenstack/admin/components/Breadcrumbs";
import Button from "@kenstack/components/Button";
import { uploadsConfigured } from "@kenstack/lib/mediaStorage";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

import type {
  AnyAdminConfig,
  DefinedAdmin,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import {
  getHiddenFields,
  loadFieldAccess,
} from "@kenstack/admin/lib/fieldAccess";
import NoAccess from "@kenstack/auth/components/NoAccess";
import { hasAccess } from "@kenstack/auth/server/auth";
import { requireUser } from "@kenstack/auth/server/user";
import type { ModuleClient } from "@kenstack/admin/client";
import { loadAdminEdit, loadOneToOne } from "@kenstack/admin/queries/load";
import { loadAdminParentRecord } from "@kenstack/admin/queries/parent";
import { getAdminRecordTitle } from "@kenstack/admin/lib/recordTitle";
import { getOneToOneQueryKey } from "./queryKey";
import { modules } from "@app/modules";
import { GuardedLink } from "@kenstack/forms/NavigationBlocker";

export default async function AdminEditPage({
  name,
  moduleTitle,
  id,
  isNew = false,
  adminConfig,
  client,
  moduleParent,
  parentId,
}: {
  name: string;
  moduleTitle: string;
  id?: number;
  isNew?: boolean;
  adminConfig: AnyAdminConfig;
  client: ModuleClient | undefined;
  moduleParent?: ModuleParentOptions;
  parentId?: number;
}) {
  const { defaultValues, preview } = adminConfig;
  if (isNew && "list" in adminConfig && !adminConfig.create) {
    notFound();
  }
  const item = await loadAdminEdit({
    adminConfig,
    id,
    isNew,
    moduleParent,
    name,
  });

  if ("list" in adminConfig && !isNew && !item) {
    notFound();
  }

  // A singleton with no row yet is created by its first save, which is an edit.
  if (
    !item &&
    !("list" in adminConfig) &&
    !(await hasAccess({ module: name, permission: "edit" }))
  ) {
    return <NoAccess />;
  }

  if (item && parentId !== undefined && item.parentId !== parentId) {
    notFound();
  }

  const resolvedParentId = item?.parentId ?? parentId;
  const parentRecord =
    resolvedParentId !== undefined && moduleParent
      ? await loadAdminParentRecord({
          id: resolvedParentId,
          name: moduleParent.module,
        })
      : null;
  if (resolvedParentId !== undefined && !parentRecord) {
    notFound();
  }

  // The record loads are cached, so nothing above suspends prerendering; the
  // query cache stamps the current time when it stores a relation's data.
  await io();
  const queryClient = new QueryClient();
  const oneToOneConfig = adminConfig.oneToOne;
  const relationEntries = oneToOneConfig
    ? Object.entries(oneToOneConfig.relations)
    : [];
  const activeRelation =
    oneToOneConfig && item
      ? relationEntries.find(
          ([, binding]) => binding.value === item[oneToOneConfig.field],
        )
      : undefined;
  const oneToOne = oneToOneConfig
    ? {
        field: oneToOneConfig.field,
        relations: relationEntries.map(([relationName, binding]) => ({
          name: relationName,
          title: binding.title,
          value: binding.value,
          defaultValues: binding.defaultValues,
        })),
      }
    : undefined;

  if (!isNew && item && activeRelation) {
    const [relationName] = activeRelation;
    const relatedItem = await loadOneToOne({
      name,
      parentId: item.id,
      relationKey: relationName,
    });
    queryClient.setQueryData(
      getOneToOneQueryKey({
        name,
        parentId: item.id,
        relationKey: relationName,
      }),
      relatedItem,
    );
  }

  const [user, edit, remove, fieldAccess] = await Promise.all([
    requireUser(),
    hasAccess({ module: name, permission: "edit" }),
    hasAccess({ module: name, permission: "delete" }),
    loadFieldAccess(name, isNew),
  ]);
  // A hidden field's value never reaches the browser.
  const shownItem = item && { ...item };
  for (const field of getHiddenFields(fieldAccess)) {
    delete shownItem?.[field];
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminEditProvider
        key={`${name}:${isNew ? "new" : (item?.id ?? id ?? "single")}`}
        name={name}
        id={id}
        isNew={isNew}
        single={!("list" in adminConfig)}
        userId={user.id}
        userRoles={user.roles}
        canUpload={uploadsConfigured}
        defaultValues={defaultValues ?? {}}
        item={shownItem}
        parentId={resolvedParentId}
        preview={preview}
        oneToOne={oneToOne}
        client={client}
        publish={adminConfig.publish}
        seo={adminConfig.seo}
        breadcrumbs={
          <Breadcrumbs
            currentTitle={isNew ? "New Entry" : getAdminRecordTitle(shownItem)}
            moduleName={name}
            moduleTitle={moduleTitle}
            parent={parentRecord}
          />
        }
        childModuleLinks={
          !isNew && item ? renderChildModuleLinks(modules, name, item.id) : null
        }
        canCreate={"list" in adminConfig && adminConfig.create && edit}
        permissions={{
          edit,
          delete: remove,
        }}
        fieldAccess={fieldAccess}
      >
        <EditBody />
      </AdminEditProvider>
    </HydrationBoundary>
  );
}

function renderChildModuleLinks(
  modules: DefinedAdmin,
  name: string,
  id: number,
) {
  const childModules = Object.values(modules).filter(
    (moduleConfig) =>
      moduleConfig.parent?.module === name && moduleConfig.admin,
  );

  if (!childModules.length) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-medium">Manage</h2>
      <div className="flex flex-wrap gap-2">
        {childModules.map((moduleConfig) => {
          const Icon = moduleConfig.icon;
          const href = `/admin/${id}/${moduleConfig.name}`;

          return (
            <Button key={href} asChild variant="outline">
              <GuardedLink href={href}>
                {Icon ? <Icon className="size-4" /> : null}
                {moduleConfig.title}
              </GuardedLink>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
