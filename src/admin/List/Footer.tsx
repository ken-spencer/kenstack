import { useMemo } from "react";
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
  const { page, query, adminConfig } = useAdminList();

  const limit = adminConfig.list.limit || 25;

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
      <div className="flex-1 md:flex-0">
        <PaginationCont page={page} totalPages={totalPages} />
      </div>
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
  /** Convert search params to an object we can use.  */
  const params = omit(Object.fromEntries(searchParams.entries()), "page");

  const isFirst = page <= 1;

  //   const searchParamsPlain = omit(
  // p    "page"
  //   );

  const [firstPages, lastPages] = useMemo(() => {
    const first = Array.from({ length: 5 }, (_, i) => i + 1).slice(
      0,
      totalPages <= 5 ? totalPages : 5
    );

    let last: number[] = [];
    if (totalPages > 5) {
      // if only one extra page beyond 5, show just that; otherwise show last two
      const extraCount = totalPages === 6 ? 1 : 2;
      last = Array.from(
        { length: extraCount },
        (_, i) => totalPages - extraCount + 1 + i
      );
    }
    return [first, last];
  }, [totalPages]);

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
              query: { ...params, ...(page > 1 ? { pabge: page - 1 } : {}) },
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
          className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
        >
          <PaginationNext
            href={{
              pathname,
              query: {
                ...params,
                page: page + 1,
              },
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function PaginationNumber({ value, searchParamsPlain }) {
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
