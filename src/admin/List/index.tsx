import { AdminListProvider } from "./context";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminConfig } from "@kenstack/admin";
import { getFilterMeta, getSortMeta } from "@kenstack/admin";
import type { ClientConfig } from "@kenstack/admin/client";
import { loadAdminList } from "@kenstack/admin/queries/list";

type AdminListProps = {
  adminConfig: AnyAdminConfig;
  basePath?: string;
  clientConfig: ClientConfig;
  searchParams: Record<string, string | string[] | undefined>;
  userId: number;
  name: string;
};

export default async function AdminListCont({
  adminConfig,
  basePath,
  clientConfig,
  searchParams,
  userId,
  name,
}: AdminListProps) {
  if (!("list" in adminConfig)) {
    return null;
  }

  const { filters, sort } = adminConfig.list;
  const sortMeta = getSortMeta(sort);
  const filterMeta = getFilterMeta(filters);
  const initialData = await loadAdminList({
    adminConfig,
    name,
    searchParams,
  });

  return (
    <AdminListProvider
      name={name}
      basePath={basePath}
      clientConfig={clientConfig}
      initialData={initialData}
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
