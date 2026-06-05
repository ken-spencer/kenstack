import { AdminListProvider } from "./context";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import { type AnyAdminConfig } from "@kenstack/admin";
import { getFilterMeta, getSortMeta } from "@kenstack/admin";
import type { ClientConfig } from "@kenstack/admin/client";
import { getAdminListQueryKey } from "@kenstack/admin/lib/listQuerySchema";
import { loadAdminList } from "@kenstack/admin/queries/list";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";

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
  const { data: initialData, query: initialQuery } = await loadAdminList({
    adminConfig,
    name,
    searchParams,
  });
  const queryClient = new QueryClient();

  queryClient.setQueryData(
    getAdminListQueryKey(name, initialQuery),
    initialData,
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminListProvider
        name={name}
        basePath={basePath}
        clientConfig={clientConfig}
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
    </HydrationBoundary>
  );
}
