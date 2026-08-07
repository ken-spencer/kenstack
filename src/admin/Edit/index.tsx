import { AdminEditProvider } from "./context";
import EditForm from "./Form";
import Header from "./Header";
import Footer from "./Footer";
import OneToOneTabs from "./OneToOneTabs";
import Breadcrumbs from "@kenstack/admin/components/Breadcrumbs";
import Button from "@kenstack/components/Button";
import { uploadsConfigured } from "@kenstack/lib/mediaStorage";
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
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import { loadAdminEdit, loadOneToOne } from "@kenstack/admin/queries/load";
import { loadAdminParentRecord } from "@kenstack/admin/queries/parent";
import { getAdminRecordTitle } from "@kenstack/admin/lib/recordTitle";
import { getOneToOneQueryKey } from "./queryKey";
import { deps } from "@app/deps";
import { GuardedLink } from "@kenstack/forms/NavigationBlocker";

export default async function AdminEdit({
  name,
  moduleTitle,
  id,
  isNew = false,
  userId,
  adminConfig,
  clients,
  moduleParent,
  parentId,
}: {
  name: string;
  moduleTitle: string;
  id?: number;
  isNew?: boolean;
  userId: number;
  adminConfig: AnyAdminConfig;
  clients: AdminClientRegistry;
  moduleParent?: ModuleParentOptions;
  parentId?: number;
}) {
  const { defaultValues, preview } = adminConfig;
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

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminEditProvider
        key={`${name}:${isNew ? "new" : (item?.id ?? id ?? "single")}`}
        name={name}
        id={id}
        isNew={isNew}
        single={!("list" in adminConfig)}
        userId={userId}
        canUpload={uploadsConfigured}
        defaultValues={defaultValues ?? {}}
        item={item}
        parentId={resolvedParentId}
        preview={preview}
        childModuleLinks={
          !isNew && item
            ? renderChildModuleLinks(deps.modules, name, item.id)
            : null
        }
        oneToOne={oneToOne}
        clients={clients}
      >
        <EditForm>
          <div className="flex flex-col gap-2">
            <Breadcrumbs
              currentTitle={isNew ? "New Entry" : getAdminRecordTitle(item)}
              moduleName={name}
              moduleTitle={moduleTitle}
              parent={parentRecord}
            />
            <Header />
            <OneToOneTabs />
            <Footer />
          </div>
        </EditForm>
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
      <div className="flex flex-col gap-2">
        {childModules.map((moduleConfig) => {
          const Icon = moduleConfig.icon;
          const href = `/admin/${id}/${moduleConfig.name}`;

          return (
            <Button
              key={href}
              asChild
              className="w-full justify-start"
              variant="outline"
            >
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
