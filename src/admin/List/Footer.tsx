"use client";

import PaginationCont from "@kenstack/list/Pagination";
import { useAdminList } from "./context";

export default function AdminListFooter() {
  const { isReorderSort, page, query, limit } = useAdminList();

  if (query.isPending || query.error || "error" === query.data.status) {
    return;
  }

  const total = query.data.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center">
      <div className="hidden md:flex md:flex-1">
        {total} {total > 1 ? "entries" : "entry"}
      </div>
      {!isReorderSort ? (
        <div className="flex-1 md:flex-0">
          <PaginationCont page={page} totalPages={totalPages} />
        </div>
      ) : null}
    </div>
  );
}
