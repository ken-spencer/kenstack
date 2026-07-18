"use client";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@kenstack/components/pagination";

import { usePathname, useSearchParams } from "next/navigation";
import { useAdminList } from "./context";

import omit from "lodash-es/omit";

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

function PaginationCont({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = omit(Object.fromEntries(searchParams.entries()), "page");
  const isFirst = page <= 1;
  const isLast = totalPages < 1 || page >= totalPages;
  const firstPages = Array.from(
    { length: Math.min(totalPages, 5) },
    (_, i) => i + 1,
  );
  const lastPages =
    totalPages === 6 ? [6] : totalPages > 6 ? [totalPages - 1, totalPages] : [];

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem
          className={isFirst ? "pointer-events-none opacity-50" : ""}
        >
          <PaginationPrevious
            aria-disabled={isFirst}
            href={{
              pathname,
              query: { ...params, ...(page > 2 ? { page: page - 1 } : {}) },
            }}
          />
        </PaginationItem>
        {firstPages.map((v) => (
          <PaginationNumber key={v} value={v} searchParamsPlain={params} />
        ))}
        {!!lastPages.length && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            {lastPages.map((v) => (
              <PaginationNumber key={v} value={v} searchParamsPlain={params} />
            ))}
          </>
        )}
        <PaginationItem
          className={isLast ? "pointer-events-none opacity-50" : ""}
        >
          <PaginationNext
            aria-disabled={isLast}
            tabIndex={isLast ? -1 : undefined}
            href={{
              pathname,
              query: {
                ...params,
                ...(!isLast ? { page: page + 1 } : page > 1 ? { page } : {}),
              },
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function PaginationNumber({
  value,
  searchParamsPlain,
}: {
  value: number;
  searchParamsPlain: Record<string, unknown>;
}) {
  const pathname = usePathname();
  const { page } = useAdminList();

  return (
    <PaginationItem
      className={value === page ? "pointer-events-none opacity-50" : ""}
    >
      <PaginationLink
        className="size-7"
        href={{
          pathname,
          query: {
            ...searchParamsPlain,
            ...(value > 1 ? { page: String(value) } : {}),
          },
        }}
      >
        {value}
      </PaginationLink>
    </PaginationItem>
  );
}
