import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";
import canUpload from "@kenstack/lib/canUpload";
import { notFound } from "next/navigation";

import type { AnyAdminConfig } from "@kenstack/admin/module";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import { loadAdminEdit } from "@kenstack/admin/queries/load";

export default async function AdminEdit({
  name,
  id,
  isNew = false,
  userId,
  adminConfig,
  clients,
}: {
  name: string;
  id?: number;
  isNew?: boolean;
  userId: number;
  adminConfig: AnyAdminConfig;
  clients: AdminClientRegistry;
}) {
  const { defaultValues, preview } = adminConfig;
  const item = await loadAdminEdit({
    adminConfig,
    id,
    isNew,
    name,
  });

  if ("list" in adminConfig && !isNew && !item) {
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
      preview={preview}
      clients={clients}
    >
      <div className="flex flex-col gap-2">
        <Header />
        <Alerts />
        <FormRender />
        <Footer />
      </div>
    </AdminEditProvider>
  );
}
