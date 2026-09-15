import { AdminListProvider } from "./context";
import { getAdminListQueryKey } from "./queryKey";

import Header from "./Header";
import Footer from "./Footer";
import List from "./List";

import type {
  AnyAdminConfig,
  ModuleParentOptions,
} from "@kenstack/admin/module";
import Breadcrumbs from "@kenstack/admin/components/Breadcrumbs";
import { getFilterMeta, getSortMeta } from "@kenstack/admin/types/list";
import type { AdminClientRegistry } from "@kenstack/admin/clientLoaders";
import {
  parseListSearchParams,
  type ListSearchParams,
} from "@kenstack/list/querySchema";
import { loadAdminList } from "@kenstack/admin/queries/list";
import { loadAdminParentRecord } from "@kenstack/admin/queries/parent";
import HydratedQuery from "@kenstack/context/HydratedQuery";
import { notFound } from "next/navigation";

type AdminListProps = {
  adminConfig: AnyAdminConfig;
  basePath?: string;
  clients: AdminClientRegistry;
  searchParams: ListSearchParams;
  userId: number;
  name: string;
  moduleTitle: string;
  parentId?: number;
  moduleParent?: ModuleParentOptions;
};

export default async function AdminListCont({
  adminConfig,
  basePath,
  clients,
  searchParams,
  userId,
  name,
  moduleTitle,
  parentId,
  moduleParent,
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
  const [{ data: initialData }, parentRecord] = await Promise.all([
    loadAdminList({
      adminConfig,
      name,
      moduleParent: parentId ? moduleParent : undefined,
      parentId,
      query: initialQuery,
    }),
    parentId && moduleParent
      ? loadAdminParentRecord({ id: parentId, name: moduleParent.module })
      : null,
  ]);

  if (parentId && !parentRecord) {
    notFound();
  }

  return (
    <HydratedQuery
      data={initialData}
      queryKey={getAdminListQueryKey({ name, parentId, query: initialQuery })}
    >
      <AdminListProvider
        name={name}
        parentId={parentId}
        basePath={basePath}
        clients={clients}
        userId={userId}
        sort={sortMeta}
        filter={filterMeta}
      >
        <section>
          <Breadcrumbs
            moduleName={name}
            moduleTitle={moduleTitle}
            parent={parentRecord}
          />
          <Header canCreate={adminConfig.create} />
          <List />
          <Footer />
        </section>
      </AdminListProvider>
    </HydratedQuery>
  );
}
