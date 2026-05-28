import { AdminListProvider } from "./context";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminConfig } from "@kenstack/admin";
import { getFilterMeta, getSortMeta } from "@kenstack/admin";
import type { ClientConfig } from "@kenstack/admin/client";

type AdminListProps = {
  adminConfig: AnyAdminConfig;
  clientConfig: ClientConfig;
  userId: number;
  name: string;
};

export default function AdminListCont({
  adminConfig,
  clientConfig,
  userId,
  name,
}: AdminListProps) {
  if (!("list" in adminConfig)) {
    return null;
  }

  const { filters, sort } = adminConfig.list;

  return (
    <AdminListProvider
      name={name}
      clientConfig={clientConfig}
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
