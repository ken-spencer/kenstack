import { AdminListProvider } from "./context";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminTableConfig } from "@kenstack/admin";
import { getFilterMeta, getSortMeta } from "@kenstack/admin";

type AdminListProps = {
  adminConfig: AnyAdminTableConfig;
  userId: number;
  name: string;
};

export default function AdminListCont({
  adminConfig: { client, filters, sort },
  userId,
  name,
}: AdminListProps) {
  return (
    <AdminListProvider
      name={name}
      client={client}
      userId={userId}
      sort={getSortMeta(sort)}
      filter={getFilterMeta(filters)}
    >
      <section>
        <Header />
        <List />
        <Footer />
      </section>
    </AdminListProvider>
  );
}
