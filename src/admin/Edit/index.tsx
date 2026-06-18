import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";
import canUpload from "@kenstack/lib/canUpload";
import { notFound } from "next/navigation";

import type { AnyAdminConfig } from "@kenstack/admin/module";
import type { ClientConfig } from "@kenstack/admin/client";
import { loadAdminEdit } from "@kenstack/admin/queries/load";

export default async function AdminEdit({
  name,
  id,
  isNew = false,
  userId,
  adminConfig,
  clientConfig,
}: {
  name: string;
  id?: number;
  isNew?: boolean;
  userId: number;
  adminConfig: AnyAdminConfig;
  clientConfig: ClientConfig;
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
      clientConfig={clientConfig}
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
