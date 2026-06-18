import { AdminListProvider } from "./context";
import { getAdminListQueryKey } from "./queryKey";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import type { AnyAdminConfig } from "@kenstack/admin/module";
import { getFilterMeta, getSortMeta } from "@kenstack/admin/types/list";
import type { ClientConfig } from "@kenstack/admin/client";
import {
  parseListSearchParams,
  type ListSearchParams,
} from "@kenstack/list/querySchema";
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
  searchParams: ListSearchParams;
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
  const initialQuery = parseListSearchParams({
    filters,
    searchParams,
    sort,
  });
  const { data: initialData } = await loadAdminList({
    adminConfig,
    name,
    query: initialQuery,
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
