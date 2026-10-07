/*
 * Public entry point: getAdminListQueryPrefix, for a module's own list query keys. The full
 * getAdminListQueryKey is Kenstack's own.
 */

import type { ListQueryStoreState } from "@kenstack/list/querySchema";

// A module's own list keys its queries under this prefix too, so the editor's saves and deletes,
// which invalidate every "admin-list" query, refresh it.
export function getAdminListQueryPrefix(name: string) {
  return ["admin-list", name] as const;
}

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
    ...getAdminListQueryPrefix(name),
    parentId ?? null,
    query.keywords,
    query.trash,
    query.sort,
    query.direction,
    query.filters,
    query.page,
  ] as const;
}
