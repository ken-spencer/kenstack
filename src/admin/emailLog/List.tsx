"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import startCase from "lodash-es/startCase";

import deps from "@app/deps";
import fetcher from "@kenstack/api/fetcher";
import type {
  AdminFilterMeta,
  AdminSortMeta,
} from "@kenstack/admin/types/list";
import Notice from "@kenstack/components/Notice";
import { dateFormat } from "@kenstack/lib/dateFormat";
import FilterControl from "@kenstack/list/FilterControl";
import KeywordSearch from "@kenstack/list/KeywordSearch";
import Pagination from "@kenstack/list/Pagination";
import SortControl from "@kenstack/list/SortControl";
import {
  createDefaultListQueryState,
  createListSearchSchema,
  listQuerySearchParams,
  parseListPage,
  searchParamsToRecord,
  type ListQueryStoreState,
} from "@kenstack/list/querySchema";
import useQueryStore from "@kenstack/list/useQueryStore";
import type { listEmailMessages } from "./queries";
import { buildEmailLogQueryKey } from "./queryKey";
import StatusBadge from "./StatusBadge";

const sentFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: deps.defaultTimeZone,
});

export default function EmailLogList({
  filter,
  sort,
}: {
  filter: AdminFilterMeta[];
  sort: AdminSortMeta[];
}) {
  const defaults = createDefaultListQueryState(sort);
  const serialize = (state: ListQueryStoreState & { page?: number }) =>
    listQuerySearchParams(state, { defaults, sort });
  const [filters, debouncedFilters, setFilters, searchParams] = useQueryStore(
    defaults,
    {
      schema: createListSearchSchema({ defaults, filters: filter, sort }),
      serialize,
    },
  );
  const query = {
    ...debouncedFilters,
    page: parseListPage(searchParams.get("page")),
  };
  const results = useQuery({
    queryKey: buildEmailLogQueryKey(query),
    queryFn: ({ signal }) =>
      fetcher<Awaited<ReturnType<typeof listEmailMessages>>>(
        "/api/admin",
        {
          action: "email-log",
          search: searchParamsToRecord(serialize(query)),
        },
        { signal },
      ),
    placeholderData: keepPreviousData,
  });
  const data = results.data?.status === "success" ? results.data : undefined;
  const hrefQuery = serialize(query).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="email-log-search" className="sr-only">
            Search emails
          </label>
          <KeywordSearch
            id="email-log-search"
            filters={filters}
            setFilters={setFilters}
            maxLength={200}
            placeholder="Address, subject or SES message ID"
            className="max-w-none p-0"
          />
        </div>
        <SortControl filters={filters} setFilters={setFilters} sort={sort} />
        <FilterControl
          filters={filters}
          setFilters={setFilters}
          filter={filter}
        />
      </div>
      {results.error || results.data?.status === "error" ? (
        <Notice>{results.error?.message ?? results.data?.message}</Notice>
      ) : null}
      {data ? (
        <>
          <ul
            className="max-w-[60rem] divide-y divide-[var(--admin-divider)] border-y border-y-[var(--admin-divider)] text-sm"
            aria-busy={results.isFetching}
          >
            {data.messages.map((message) => (
              <li
                key={message.id}
                className="hover:bg-muted/40 flex items-center gap-3 px-2 py-1.5 md:grid md:grid-cols-[auto_minmax(0,1fr)_10rem_8rem]"
              >
                <StatusBadge
                  iconOnly
                  isUnconfirmed={message.isUnconfirmed}
                  reason={message.error}
                  status={message.status}
                />
                {/* Aligned columns on desktop; on a narrow screen the kind and time go under the recipient. */}
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 md:contents">
                  <Link
                    className="max-w-full truncate font-semibold"
                    href={`/admin/email-log/${message.id}${hrefQuery ? `?${hrefQuery}` : ""}`}
                    title={message.subject}
                  >
                    {message.to}
                  </Link>
                  <span className="text-muted-foreground basis-full whitespace-nowrap md:contents">
                    <span className="md:truncate">
                      {startCase(message.kind)}
                    </span>
                    <span className="md:hidden"> · </span>
                    <time
                      className="tabular-nums md:text-right"
                      dateTime={message.createdAt}
                      title={dateFormat(message.createdAt)}
                      suppressHydrationWarning
                    >
                      {sentFormat.format(new Date(message.createdAt))}
                    </time>
                  </span>
                </div>
              </li>
            ))}
            {!data.messages.length && (
              <li className="text-muted-foreground px-2 py-1.5 text-center">
                {query.keywords || Object.keys(query.filters).length
                  ? "No emails match these filters."
                  : "No emails have been sent yet."}
              </li>
            )}
          </ul>
          <div className="flex max-w-[60rem] items-center">
            <div aria-live="polite" className="hidden md:flex md:flex-1">
              {results.isFetching
                ? "Loading emails…"
                : `${data.total.toLocaleString()} ${data.total === 1 ? "email" : "emails"}`}
            </div>
            <div className="flex-1 md:flex-0">
              <Pagination
                page={query.page}
                totalPages={Math.ceil(data.total / data.pageSize)}
              />
            </div>
          </div>
        </>
      ) : results.isFetching ? (
        <p role="status">Loading emails…</p>
      ) : null}
    </div>
  );
}
