import type { ListQueryStoreState } from "@kenstack/list/querySchema";

export function getAdminListQueryKey({
  name,
  parentId,
  query,
}: {
  name: string;
  parentId?: number;
  query: ListQueryStoreState & { page: number };
}) {
  return [
    "admin-list",
    name,
    parentId ?? null,
    query.keywords,
    query.trash,
    query.sort,
    query.direction,
    query.filters,
    query.page,
  ] as const;
}
