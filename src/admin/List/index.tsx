import { AdminListProvider } from "./context";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminTableConfig } from "@kenstack/admin";
type AdminListProps = {
  adminConfig: AnyAdminTableConfig;
  userId: number;
  name: string;
};

export default function AdminListCont({
  adminConfig: { client, filterMeta, sortMeta },
  userId,
  name,
}: AdminListProps) {
  return (
    <AdminListProvider
      name={name}
      client={client}
      userId={userId}
      sort={sortMeta}
      filter={filterMeta}
    >
      <section>
        <Header />
        <List />
        <Footer />
      </section>
    </AdminListProvider>
  );
}
