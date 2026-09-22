"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import omit from "lodash-es/omit";

import fetcher from "@kenstack/api/fetcher";
import ListTitle from "@kenstack/admin/components/ListTitle";
import Updated from "@kenstack/admin/components/Updated";
import { Button } from "@kenstack/components/Button";
import Notice from "@kenstack/components/Notice";
import Combobox from "@kenstack/forms/controls/Combobox";
import useDebounce from "@kenstack/hooks/useDebounce";
import { formatMoney } from "@kenstack/lib/money";
import FilterControl from "@kenstack/list/FilterControl";
import KeywordSearch from "@kenstack/list/KeywordSearch";
import PaginationCont from "@kenstack/list/Pagination";
import SortControl from "@kenstack/list/SortControl";
import {
  parseListPage,
  searchParamsToRecord,
} from "@kenstack/list/querySchema";
import useQueryStore from "@kenstack/list/useQueryStore";
import {
  channelLabels,
  orderFilters,
  orderQueryDefaults,
  orderSearchParams,
  orderSearchSchema,
  orderSort,
} from "./query";
import type { listOrders, searchOrderCustomers } from "./queries";
import StatusBadge from "./StatusBadge";

export default function OrdersList({
  currentUserId,
}: {
  currentUserId: number;
}) {
  const [filters, debouncedFilters, setFilters, searchParams] = useQueryStore(
    orderQueryDefaults,
    {
      schema: orderSearchSchema,
      serialize: orderSearchParams,
    },
  );
  const query = {
    ...debouncedFilters,
    page: parseListPage(searchParams.get("page")),
  };
  const results = useQuery({
    queryKey: ["payments", "orders", currentUserId, query],
    queryFn: ({ signal }) =>
      fetcher<Awaited<ReturnType<typeof listOrders>>>(
        "/api/payments",
        {
          action: "list-orders",
          search: searchParamsToRecord(orderSearchParams(query)),
        },
        { signal },
      ),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === currentUserId ? previous : undefined,
  });
  const [customerSearch, debouncedCustomerSearch, setCustomerSearch] =
    useDebounce();
  const customers = useQuery({
    queryKey: ["payments", "customers", currentUserId, debouncedCustomerSearch],
    enabled: debouncedCustomerSearch.trim().length >= 2,
    queryFn: ({ signal }) =>
      fetcher<Awaited<ReturnType<typeof searchOrderCustomers>>>(
        "/api/payments",
        {
          action: "search-order-customers",
          term: debouncedCustomerSearch,
        },
        { signal },
      ),
  });
  const data = results.data?.status === "success" ? results.data : undefined;
  const userId =
    typeof filters.filters.userId === "string" ? filters.filters.userId : "";
  const selectedCustomer =
    data?.customer && String(data.customer.id) === userId
      ? data.customer
      : null;
  const customerMatches =
    customerSearch === debouncedCustomerSearch &&
    customerSearch.trim().length >= 2 &&
    customers.data?.status === "success"
      ? customers.data.customers.map((customer) => ({
          value: String(customer.id),
          label:
            `${customer.givenName} ${customer.familyName} · ${customer.email}`.trim(),
        }))
      : [];
  const customerOptions = [...customerMatches];
  if (userId && !customerOptions.some((option) => option.value === userId)) {
    customerOptions.unshift({
      value: userId,
      label: selectedCustomer
        ? `${selectedCustomer.givenName} ${selectedCustomer.familyName} · ${selectedCustomer.email}`.trim()
        : `User #${userId}`,
    });
  }
  const hrefQuery = orderSearchParams(query).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 grow">
          <label htmlFor="orders-search" className="sr-only">
            Search orders
          </label>
          <KeywordSearch
            id="orders-search"
            filters={filters}
            setFilters={setFilters}
            maxLength={200}
            placeholder="Order, customer, item or payment reference"
            className="max-w-none p-0"
          />
        </div>
        <div className="w-full sm:w-72">
          <label htmlFor="orders-customer" className="sr-only">
            Customer
          </label>
          <Combobox
            value={userId}
            options={customerOptions}
            filter={(option) =>
              customerMatches.some((match) => match.value === option.value)
            }
            commitOnBlur={false}
            onInputValueChange={setCustomerSearch}
            onOpenChange={(open) => {
              if (open) setCustomerSearch("");
            }}
            onValueChange={(value) => {
              setCustomerSearch("");
              setFilters(
                (previous) => ({
                  ...previous,
                  filters: value
                    ? { ...previous.filters, userId: value }
                    : omit(previous.filters, "userId"),
                }),
                false,
              );
            }}
            inputProps={{
              id: "orders-customer",
              placeholder: "Customer name or email…",
              maxLength: 200,
              showClear: true,
              className: "w-full",
            }}
            emptyMessage={
              customerSearch.trim().length < 2
                ? "Type at least 2 characters."
                : customers.isFetching ||
                    customerSearch !== debouncedCustomerSearch
                  ? "Searching…"
                  : "No customers found."
            }
          />
        </div>
        <SortControl
          filters={filters}
          setFilters={setFilters}
          sort={orderSort}
        />
        <FilterControl
          filters={filters}
          setFilters={setFilters}
          filter={orderFilters}
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh orders"
          disabled={results.isFetching}
          onClick={() => results.refetch()}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      {customers.error || customers.data?.status === "error" ? (
        <Notice>{customers.error?.message ?? customers.data?.message}</Notice>
      ) : null}
      {results.error || results.data?.status === "error" ? (
        <Notice>{results.error?.message ?? results.data?.message}</Notice>
      ) : null}
      {!data && results.isFetching ? (
        <p role="status">Loading orders…</p>
      ) : null}
      {data && (
        <>
          <div
            className="overflow-x-auto border-y border-y-[var(--admin-divider)]"
            aria-busy={results.isFetching}
          >
            <table className="w-full text-left text-sm [&_td]:px-2 [&_td]:py-2">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Order / created</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col">Payment schedule or paid to date</th>
                  <th scope="col">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-divider)]">
                {data.orders.map((order) => {
                  const money = (cents: number) =>
                    formatMoney(cents, { currency: order.currency }).replace(
                      /\.00$/,
                      "",
                    );
                  const refundedAmount =
                    order.refundStatus !== "none" ? (
                      <>
                        <span className="sr-only">Originally paid </span>
                        <s className="text-muted-foreground">
                          {money(order.paidCents)}
                        </s>
                        <div>
                          <span className="sr-only">Net collected </span>
                          {money(order.collectedCents)}
                        </div>
                      </>
                    ) : null;
                  return (
                    <tr key={order.id} className="hover:bg-muted/40 align-top">
                      <td>
                        <ListTitle
                          path={`/admin/orders/${order.id}${hrefQuery ? `?${hrefQuery}` : ""}`}
                          title={
                            <>
                              #{order.id}
                              <span className="text-muted-foreground ml-2 text-xs">
                                {channelLabels[order.channel]}
                              </span>
                            </>
                          }
                        >
                          <Updated value={order.createdAt} />
                        </ListTitle>
                      </td>
                      <td>
                        <div>
                          {order.customerSnapshot.givenName}{" "}
                          {order.customerSnapshot.familyName}
                        </div>
                        <div className="text-muted-foreground text-xs break-all">
                          {order.customerSnapshot.email}
                        </div>
                      </td>
                      <td>
                        <StatusBadge order={order} />
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">
                        {refundedAmount ? (
                          order.paymentCount !== 1 ? (
                            refundedAmount
                          ) : null
                        ) : order.monthlyCents !== null ? (
                          <span className="text-muted-foreground">monthly</span>
                        ) : order.paymentCount !== null &&
                          order.paymentCount > 1 ? (
                          money(order.collectedCents)
                        ) : null}
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">
                        {refundedAmount && order.paymentCount === 1
                          ? refundedAmount
                          : order.monthlyCents !== null
                            ? money(order.monthlyCents)
                            : order.committedCents !== null
                              ? money(order.committedCents)
                              : "—"}
                        {refundedAmount && order.monthlyCents !== null && (
                          <div className="text-muted-foreground text-xs">
                            monthly
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!data.orders.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground text-center"
                    >
                      No orders match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center">
            <div aria-live="polite" className="hidden md:flex md:flex-1">
              {results.isFetching
                ? "Loading orders…"
                : `${data.total.toLocaleString()} ${data.total === 1 ? "order" : "orders"}`}
            </div>
            <div className="flex-1 md:flex-0">
              <PaginationCont
                page={query.page}
                totalPages={Math.ceil(data.total / data.pageSize)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
