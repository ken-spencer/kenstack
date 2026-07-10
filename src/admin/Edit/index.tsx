import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";
import Breadcrumbs from "@kenstack/admin/components/Breadcrumbs";
import Button from "@kenstack/components/Button";
import canUpload from "@kenstack/lib/canUpload";
import Link from "next/link";
import { notFound } from "next/navigation";

import type {
  AnyAdminConfig,
  DefinedAdmin,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import { loadAdminEdit } from "@kenstack/admin/queries/load";
import { loadAdminParentRecord } from "@kenstack/admin/queries/parent";
import { getAdminRecordTitle } from "@kenstack/admin/lib/recordTitle";
import { deps } from "@app/deps";

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

  const resolvedParentId = parentId ?? item?.parentId;
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

  return (
    <AdminEditProvider
      name={name}
      id={id}
      isNew={isNew}
      single={!("list" in adminConfig)}
      userId={userId}
      canUpload={canUpload()}
      defaultValues={defaultValues ?? {}}
      item={item}
      parentId={resolvedParentId}
      preview={preview}
      childModuleLinks={
        !isNew && item
          ? renderChildModuleLinks(deps.modules, name, item.id)
          : null
      }
      clients={clients}
    >
      <div className="flex flex-col gap-2">
        <Breadcrumbs
          currentTitle={isNew ? "New Entry" : getAdminRecordTitle(item)}
          moduleName={name}
          moduleTitle={moduleTitle}
          parent={parentRecord}
        />
        <Header />
        <Alerts />
        <FormRender />
        <Footer />
      </div>
    </AdminEditProvider>
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
              <Link href={href}>
                {Icon ? <Icon className="size-4" /> : null}
                {moduleConfig.title}
              </Link>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
