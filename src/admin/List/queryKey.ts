import type { ListQueryStoreState } from "@kenstack/list/querySchema";

export function getAdminListQueryKey(
  name: string,
  query: ListQueryStoreState & { page: number },
) {
  return [
    "admin-list",
    name,
    query.keywords,
    query.trash,
    query.sort,
    query.direction,
    query.filters,
    query.page,
  ] as const;
}
