import { AdminEditProvider } from "./context";
import Header from "./Header";
import Alerts from "./Alerts";
import Footer from "./Footer";
import FormRender from "./FormRender";

import { type AnyAdminTable } from "..";

export default function AdminEdit({
  name,
  adminTable,
}: {
  name: string;
  adminTable: AnyAdminTable;
}) {
  const { defaultValues, preview, client } = adminTable;

  return (
    <AdminEditProvider
      name={name}
      defaultValues={defaultValues}
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
