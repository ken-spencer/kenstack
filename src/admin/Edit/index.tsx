import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";

import { type AnyAdminConfig } from "..";

export default function AdminEdit({
  name,
  id,
  recordKey,
  isNew,
  userId,
  adminConfig,
}: {
  name: string;
  id?: number;
  recordKey?: string;
  isNew: boolean;
  userId: number;
  adminConfig: AnyAdminConfig;
}) {
  const { defaultValues, preview, client } = adminConfig;

  return (
    <AdminEditProvider
      name={name}
      id={id}
      recordKey={recordKey}
      isNew={isNew}
      single={adminConfig.single}
      userId={userId}
      defaultValues={defaultValues as Record<string, unknown>}
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
