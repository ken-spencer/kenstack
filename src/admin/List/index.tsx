import { AdminListProvider } from "./context";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminTable } from "@kenstack/admin";
type AdminListProps = {
  adminTable: AnyAdminTable;
  userId: number;
  name: string;
};

export default function AdminListCont({
  adminTable: { client },
  userId,
  name,
}: AdminListProps) {
  return (
    <AdminListProvider name={name} client={client} userId={userId}>
      <section>
        <Header />
        <List />
        <Footer />
      </section>
    </AdminListProvider>
  );
}
