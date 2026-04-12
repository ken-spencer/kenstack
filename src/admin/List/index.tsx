import { AdminListProvider } from "./context";
import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminTable } from "@kenstack/admin";
type AdminListProps = {
  adminTable: AnyAdminTable;
};

export default function AdminListCont({
  adminTable: { client },
}: AdminListProps) {
  return (
    <AdminListProvider client={client}>
      <section>
        <Header />
        <List />
        <Footer />
      </section>
    </AdminListProvider>
  );
}
