import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";
import Breadcrumbs from "@kenstack/admin/components/Breadcrumbs";
import canUpload from "@kenstack/lib/canUpload";
import { notFound } from "next/navigation";

import type {
  AnyAdminConfig,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import { loadAdminEdit } from "@kenstack/admin/queries/load";
import { loadAdminParentRecord } from "@kenstack/admin/queries/parent";
import { getAdminRecordTitle } from "@kenstack/admin/lib/recordTitle";

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
