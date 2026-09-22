import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import * as z from "zod";

import { Badge } from "@kenstack/components/Badge";
import Button from "@kenstack/components/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { dateFormat } from "@kenstack/lib/dateFormat";
import { formatMoney } from "@kenstack/lib/money";
import { pageRoute } from "@kenstack/pageRoute";
import { loadOrder } from "./queries";
import StatusBadge from "./StatusBadge";
import {
  channelLabels,
  orderListSchema,
  orderSearchParams,
  paymentStatusLabels,
  transactionMethodLabels,
} from "./query";

export const metadata: Metadata = { title: { absolute: "Order · Admin" } };

export default pageRoute(
  {
    access: "admin",
    params: z.object({
      id: z.coerce.number().int().positive().max(2147483647),
    }),
    fallback: <p>Loading order…</p>,
  },
  async ({ params, searchIn }) => {
    const result = await loadOrder(params.id);
    if (!result) notFound();
    const { order, items, transactions } = result;
    const taxes = new Map<string, (typeof items)[number]["taxes"][number]>();
    for (const item of items) {
      for (const tax of item.taxes) {
        const key = JSON.stringify([
          tax.id,
          tax.code,
          tax.name,
          tax.rate,
          tax.isIncluded,
        ]);
        taxes.set(key, {
          ...tax,
          amountCents: (taxes.get(key)?.amountCents ?? 0) + tax.amountCents,
        });
      }
    }
    const totalCents = items.reduce<number | null>(
      (total, item) =>
        total === null || item.totalCents === null
          ? null
          : total + item.totalCents,
      0,
    );
    const addedTaxCents = [...taxes.values()].reduce(
      (total, tax) => total + (tax.isIncluded ? 0 : tax.amountCents),
      0,
    );
    const stripeDashboardUrl =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_")
        ? "https://dashboard.stripe.com/test"
        : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_live_")
          ? "https://dashboard.stripe.com"
          : null;
    const customer = order.customerSnapshot;
    const search = orderSearchParams(
      orderListSchema.parse({ search: searchIn }),
    ).toString();
    return (
      <div className="space-y-6 py-2">
        <Link
          className="link text-sm"
          href={`/admin/orders${search ? `?${search}` : ""}`}
        >
          ← Orders
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Order #{order.id}</h1>
          <StatusBadge order={order} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-2">
            <h2 className="font-semibold">Customer</h2>
            <p>
              {customer.givenName} {customer.familyName}
              <br />
              {customer.email}
            </p>
            <p className="text-muted-foreground text-sm">
              {[
                customer.addressLine1,
                customer.addressLine2,
                customer.locality,
                customer.regionCode,
                customer.postalCode,
                customer.countryCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {order.userId && (
              <div className="flex flex-wrap gap-4 text-sm">
                <Link className="link" href={`/admin/users/${order.userId}`}>
                  User record
                </Link>
                <Link
                  className="link"
                  href={`/admin/orders?userId=${order.userId}`}
                >
                  All orders for this user
                </Link>
              </div>
            )}
          </section>
          <section className="space-y-2">
            <h2 className="font-semibold">Payment arrangement</h2>
            <p>
              {order.paymentCount === null
                ? `${formatMoney(order.monthlyCents ?? 0, { currency: order.currency })} monthly, ongoing`
                : order.paymentCount === 1
                  ? "One-time payment"
                  : `${order.paymentCount} scheduled payments`}
            </p>
            <p>
              Collected:{" "}
              {formatMoney(
                transactions
                  .filter((transaction) => transaction.status === "succeeded")
                  .reduce(
                    (sum, transaction) => sum + transaction.totalCents,
                    0,
                  ),
                { currency: order.currency },
              )}{" "}
              {order.currency.toUpperCase()}
            </p>
            <p className="text-muted-foreground text-sm">
              {channelLabels[order.channel]} · Created{" "}
              {dateFormat(order.createdAt, { timeZone: "UTC" })} UTC
            </p>
            <p className="text-muted-foreground text-sm">
              Fee coverage: {order.coverFees ? "Yes" : "No"}
            </p>
            {order.stripeSubscriptionId && (
              <p className="text-xs break-all">
                Subscription: {order.stripeSubscriptionId}
              </p>
            )}
            {order.stripeScheduleId && (
              <p className="text-xs break-all">
                Schedule: {order.stripeScheduleId}
              </p>
            )}
          </section>
        </div>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="space-y-4 border-y border-y-[var(--admin-divider)] py-4">
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-6 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.quantity} ×{" "}
                      {formatMoney(item.unitCents, {
                        currency: order.currency,
                      })}
                    </p>
                    {item.discounts.map((discount) => (
                      <div
                        key={discount.id}
                        className="text-muted-foreground text-xs"
                      >
                        {discount.name}: −
                        {formatMoney(discount.amountCents, {
                          currency: order.currency,
                        })}
                      </div>
                    ))}
                  </div>
                  <p className="text-right font-medium tabular-nums">
                    {item.totalCents === null
                      ? "Ongoing"
                      : formatMoney(
                          item.totalCents -
                            item.taxes.reduce(
                              (total, tax) =>
                                total + (tax.isIncluded ? 0 : tax.amountCents),
                              0,
                            ),
                          {
                            currency: order.currency,
                          },
                        )}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-t-[var(--admin-divider)] pt-4 text-sm">
              {totalCents !== null && addedTaxCents !== 0 && (
                <div className="flex justify-between gap-6">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">
                    {formatMoney(totalCents - addedTaxCents, {
                      currency: order.currency,
                    })}
                  </dd>
                </div>
              )}
              {[...taxes]
                .filter(([, tax]) => !tax.isIncluded)
                .map(([key, tax]) => (
                  <div key={key} className="flex justify-between gap-6">
                    <dt>{tax.code || tax.name}</dt>
                    <dd className="tabular-nums">
                      {formatMoney(tax.amountCents, {
                        currency: order.currency,
                      })}
                    </dd>
                  </div>
                ))}
              <div className="flex justify-between gap-6 text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {totalCents === null
                    ? "Ongoing"
                    : formatMoney(totalCents, { currency: order.currency })}
                </dd>
              </div>
              {[...taxes]
                .filter(([, tax]) => tax.isIncluded)
                .map(([key, tax]) => (
                  <div
                    key={key}
                    className="text-muted-foreground flex justify-between gap-6 text-xs"
                  >
                    <dt>Includes {tax.code || tax.name}</dt>
                    <dd className="tabular-nums">
                      {formatMoney(tax.amountCents, {
                        currency: order.currency,
                      })}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <div className="overflow-x-auto border-y border-y-[var(--admin-divider)]">
            <table className="w-full text-left text-sm [&_td]:py-4 [&_td:not(:last-child)]:pr-6 [&_th]:py-3 [&_th]:font-normal [&_th:not(:last-child)]:pr-6">
              <thead className="text-muted-foreground text-xs">
                <tr>
                  <th scope="col">Transaction / created (UTC)</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    Amount ({order.currency.toUpperCase()})
                  </th>
                  <th scope="col" className="text-right">
                    Provider fee ({order.currency.toUpperCase()})
                  </th>
                  <th scope="col">References</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const references = [
                    {
                      label: "Payment Intent",
                      id: transaction.stripePaymentIntentId,
                    },
                    { label: "Charge", id: transaction.stripeChargeId },
                    { label: "Invoice", id: transaction.stripeInvoiceId },
                    { label: "Refund", id: transaction.stripeRefundId },
                    { label: "Dispute", id: transaction.stripeDisputeId },
                    {
                      label: "Balance transaction",
                      id: transaction.stripeBalanceTransactionId,
                    },
                  ].filter((reference) => reference.id);
                  const paymentId =
                    transaction.stripePaymentIntentId ??
                    transaction.stripeChargeId;
                  return (
                    <tr key={transaction.id} className="align-top">
                      <td>
                        #{transaction.id} ·{" "}
                        {transaction.kind.replaceAll("_", " ")}
                        <div className="text-muted-foreground text-xs">
                          {dateFormat(transaction.createdAt, {
                            timeZone: "UTC",
                          })}
                        </div>
                        <div className="text-muted-foreground flex flex-wrap gap-x-2 text-xs">
                          {!references.length && transaction.method && (
                            <span>
                              {transactionMethodLabels[transaction.method]}
                            </span>
                          )}
                          {transaction.instalment ? (
                            <span>Payment {transaction.instalment}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            transaction.status === "failed" ||
                            transaction.status === "requires_action"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {paymentStatusLabels[transaction.status]}
                        </Badge>
                        {transaction.errorCode && (
                          <div className="mt-1 text-xs">
                            {transaction.errorCode}
                          </div>
                        )}
                        {transaction.finishedAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            Finished{" "}
                            {dateFormat(transaction.finishedAt, {
                              timeZone: "UTC",
                            })}
                          </div>
                        )}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatMoney(transaction.totalCents, {
                          currency: order.currency,
                        })}
                      </td>
                      <td className="text-right tabular-nums">
                        {transaction.feeCents === null
                          ? "Not reconciled"
                          : formatMoney(transaction.feeCents, {
                              currency: order.currency,
                            })}
                      </td>
                      <td className="max-w-64 text-xs break-all">
                        {transaction.originalTransactionId && (
                          <div>
                            Original transaction #
                            {transaction.originalTransactionId}
                          </div>
                        )}
                        {references.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                size="xs"
                                variant="ghost"
                                className="text-[#635bff] hover:text-[#5147e5]"
                              >
                                <span className="font-bold">Stripe</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              aria-label="Stripe references"
                              className="w-80 max-w-[calc(100vw-2rem)] space-y-3"
                            >
                              {stripeDashboardUrl && paymentId && (
                                <a
                                  href={`${stripeDashboardUrl}/payments/${encodeURIComponent(paymentId)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link text-sm"
                                >
                                  View in Stripe ↗
                                </a>
                              )}
                              {transaction.method && (
                                <p className="text-sm font-medium">
                                  {transactionMethodLabels[transaction.method]}
                                </p>
                              )}
                              <dl className="space-y-3">
                                {references.map((reference) => (
                                  <div key={reference.label}>
                                    <dt className="text-muted-foreground text-xs">
                                      {reference.label}
                                    </dt>
                                    <dd className="font-mono text-xs break-all select-text">
                                      {reference.id}
                                    </dd>
                                  </div>
                                ))}
                              </dl>
                            </PopoverContent>
                          </Popover>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!transactions.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground text-center"
                    >
                      No payment attempts recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  },
);
