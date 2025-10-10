import { AdminListProvider } from "./context";
import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AdminClientConfig } from "@kenstack/admin/types";
type AdminListProps = {
  admin: AdminClientConfig;
};

export default function AdminListCont({ admin }: AdminListProps) {
  return (
    <AdminListProvider admin={admin}>
      <section>
        <Header />
        <List />
        <Footer />
      </section>
    </AdminListProvider>
  );
}
