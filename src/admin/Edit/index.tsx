import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";
import canUpload from "@kenstack/lib/canUpload";

import { type AnyAdminConfig } from "..";

export default function AdminEdit({
  name,
  id,
  isNew = false,
  userId,
  adminConfig,
}: {
  name: string;
  id?: number;
  isNew?: boolean;
  userId: number;
  adminConfig: AnyAdminConfig;
}) {
  const { defaultValues, preview, client } = adminConfig;

  return (
    <AdminEditProvider
      name={name}
      id={id}
      isNew={isNew}
      single={adminConfig.single}
      userId={userId}
      canUpload={canUpload()}
      defaultValues={defaultValues ?? {}}
      preview={preview}
      client={client}
    >
      <div className="flex flex-col gap-2">
        <Header />
        <Alerts />
        <FormRender client={client} />
        <Footer />
      </div>
    </AdminEditProvider>
  );
}
