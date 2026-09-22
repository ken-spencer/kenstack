"use client";
import { Fragment } from "react";
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
import { searchParamsToRecord } from "@kenstack/list/querySchema";

import omit from "lodash-es/omit";

export default function PaginationCont({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = omit(searchParamsToRecord(searchParams), "page");
  const isFirst = page <= 1;
  const isLast = totalPages < 1 || page >= totalPages;
  const pages = [
    ...new Set([
      ...Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1),
      ...(page >= 1 && page <= totalPages ? [page] : []),
      ...(totalPages === 6
        ? [6]
        : totalPages > 6
          ? [totalPages - 1, totalPages]
          : []),
    ]),
  ].sort((a, b) => a - b);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem
          className={isFirst ? "pointer-events-none opacity-50" : ""}
        >
          <PaginationPrevious
            aria-disabled={isFirst}
            tabIndex={isFirst ? -1 : undefined}
            href={{
              pathname,
              query: { ...params, ...(page > 2 ? { page: page - 1 } : {}) },
            }}
          />
        </PaginationItem>
        {pages.map((v, index) => (
          <Fragment key={v}>
            {index > 0 && v - pages[index - 1] > 1 && (
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
            )}
            <PaginationNumber
              value={v}
              page={page}
              searchParamsPlain={params}
            />
          </Fragment>
        ))}
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
  page,
}: {
  value: number;
  page: number;
  searchParamsPlain: Record<string, unknown>;
}) {
  const pathname = usePathname();

  return (
    <PaginationItem
      className={value === page ? "pointer-events-none opacity-50" : ""}
    >
      <PaginationLink
        className="size-7"
        isActive={value === page}
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
