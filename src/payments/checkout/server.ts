// Host payment configuration binds createCheckout once; each product's API route mounts the four
// stages defineCheckout returns. Requested for the giving and private-screening checkouts, which
// adopt it in the next migration steps.
import "server-only";

import { createHash } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { NextRequest } from "next/server";
import * as z from "zod";
import { waitUntil } from "@vercel/functions";
import { db } from "@app/db";
import type { addressColumns } from "@kenstack/admin/table";
import type { DbTransaction, NumericIdTable } from "@kenstack/db/types";
import type { User } from "@kenstack/types";
import { pipelineStage } from "@kenstack/api/pipeline";
import { ReturnedError } from "@kenstack/api/errors";
import { claimQuota } from "@kenstack/api/quota";
import { getFreshCurrentUser } from "@kenstack/auth/server/user";
import { unsecureIdSchema } from "@kenstack/fields/unsecureId";
import { reportError } from "@kenstack/lib/errorReporter";
import { formatMoney } from "@kenstack/lib/money";
import { audit } from "@kenstack/logger";

import type { createPayments } from "../reconcile";
import { calculateInstallments } from "../installments";
import { loadStripeConfig, retryPayment } from "../server";
import { orders, orderItems, transactions } from "../tables";
import { calculateTaxLines } from "../taxes/calculate";
import { taxRegions } from "../taxes/tables";

type CheckoutQuote = {
  lines: {
    kind: string;
    description: string;
    quantity: number;
    unitCents: number;
    // A key of the categories the host passed to createTaxes.
    taxCategory?: string;
  }[];
  schedule:
    | { type: "once" }
    | { type: "monthly" }
    | { type: "instalments"; count: number };
  tax?: { countryCode: string; regionCode: string; included: boolean };
  coverFees?: boolean;
};

// Runs over fresh pricing and over saved rows alike, so the fingerprint is never stored.
function buildQuote(
  currency: string,
  paymentCount: number | null,
  lines: Pick<
    typeof orderItems.$inferSelect,
    "kind" | "description" | "quantity" | "unitCents" | "totalCents" | "taxes"
  >[],
) {
  const totalCents = lines.reduce(
    (sum, line) => sum + (line.totalCents ?? line.unitCents),
    0,
  );
  const installments =
    paymentCount === null || paymentCount === 1
      ? undefined
      : calculateInstallments(totalCents, paymentCount);
  const dueNowCents = installments?.firstPaymentCents ?? totalCents;
  return {
    lines,
    totalCents,
    dueNowCents,
    recurringCents:
      paymentCount === null
        ? totalCents
        : (installments?.monthlyPaymentCents ?? null),
    schedule:
      paymentCount === null
        ? { type: "monthly" as const }
        : paymentCount === 1
          ? { type: "once" as const }
          : { type: "instalments" as const, count: paymentCount },
    // Tuples, never objects: JSONB returns saved tax snapshots with reordered keys.
    fingerprint: createHash("sha256")
      .update(
        JSON.stringify([
          currency,
          paymentCount,
          dueNowCents,
          lines.map((line) => [
            line.kind,
            line.description,
            line.quantity,
            line.unitCents,
            line.totalCents,
            line.taxes.map((tax) => [
              tax.id,
              tax.code,
              tax.name,
              tax.rate,
              tax.isIncluded,
              tax.amountCents,
            ]),
          ]),
        ]),
      )
      .digest("hex"),
  };
}

function loadLines(orderId: number) {
  return db
    .select({
      kind: orderItems.kind,
      description: orderItems.description,
      quantity: orderItems.quantity,
      unitCents: orderItems.unitCents,
      totalCents: orderItems.totalCents,
      taxes: orderItems.taxes,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));
}

type Payment = Awaited<
  ReturnType<ReturnType<typeof createPayments>["reconcileOrder"]>
>;
export type CheckoutSessionResult = {
  publishableKey: string;
  customerSessionClientSecret: string;
  currency: string;
  returnPath: string;
  quote: ReturnType<typeof buildQuote>;
  payment?: Payment;
  retired: boolean;
};
export type CheckoutPayResult = Payment;
export type CheckoutDropResult =
  | { outcome: "dropped" }
  | { outcome: "paid" | "unresolved"; returnPath: string };
export type CheckoutStatusResult = Payment & {
  currency: string;
  quote: ReturnType<typeof buildQuote>;
};

export function createCheckout(host: {
  payments: Pick<
    ReturnType<typeof createPayments>,
    "reconcileOrder" | "createCheckoutCustomerSession"
  >;
  users: NumericIdTable &
    Record<
      "givenName" | "familyName" | "email" | keyof typeof addressColumns,
      AnyPgColumn<{ data: string; notNull: true }>
    >;
  currency: string;
}) {
  return function defineCheckout<
    TChoices,
    TQuote extends CheckoutQuote,
  >(product: {
    // Also the quota scope, `${name}-checkout`.
    name: string;
    schema: z.ZodType<TChoices>;
    lines(context: {
      choices: TChoices;
      user: User;
      connection: Pick<DbTransaction, "select">;
    }): Promise<TQuote>;
    reservation?: {
      // Runs after the order and items are inserted, so it links domain rows to item ids.
      hold(context: {
        tx: DbTransaction;
        request: NextRequest;
        user: User;
        customer: (typeof orders.$inferSelect)["customerSnapshot"];
        choices: TChoices;
        quote: TQuote;
        order: typeof orders.$inferSelect;
        items: (typeof orderItems.$inferSelect)[];
      }): Promise<{ expiresAt: Date }>;
      // A retry never receives choices; it renews the reservation from the saved order.
      extend(context: {
        tx: DbTransaction;
        request: NextRequest;
        user: User;
        order: typeof orders.$inferSelect;
        items: (typeof orderItems.$inferSelect)[];
      }): Promise<void>;
    };
    requiresAddress?: boolean;
    // Stripe returns the customer here with ?session_id=<id> appended.
    returnPath: string;
  }) {
    async function priceLines(
      quote: TQuote,
      connection: Pick<DbTransaction, "select">,
    ) {
      // The site's numbers reach integer columns and money arithmetic.
      for (const [field, value, minimum] of [
        ...quote.lines.flatMap(
          (line) =>
            [
              [`quantity of line "${line.description}"`, line.quantity, 1],
              [`unitCents of line "${line.description}"`, line.unitCents, 0],
            ] as const,
        ),
        ...(quote.schedule.type === "instalments"
          ? [["schedule count", quote.schedule.count, 1] as const]
          : []),
      ])
        if (!Number.isSafeInteger(value) || value < minimum)
          throw new Error(
            `Checkout ${product.name} returned ${value} as the ${field}; return a safe integer of at least ${minimum}.`,
          );
      const paymentCount =
        quote.schedule.type === "once"
          ? 1
          : quote.schedule.type === "monthly"
            ? null
            : quote.schedule.count;
      // Stripe bills a monthly item as one unit of unitCents.
      if (
        paymentCount === null &&
        quote.lines.some((line) => line.quantity !== 1 || line.taxCategory)
      )
        throw new Error(
          `Checkout ${product.name} returned a monthly line with a quantity other than 1 or a tax category; monthly lines must be single and untaxed.`,
        );
      let rates: ((typeof taxRegions.$inferSelect)["rates"][number] & {
        isIncluded: boolean;
      })[] = [];
      if (quote.lines.some((line) => line.taxCategory)) {
        const tax = quote.tax;
        if (!tax)
          throw new Error(
            `Checkout ${product.name} returned a line with a tax category and no tax region; return tax from lines.`,
          );
        const [region] = await connection
          .select({ rates: taxRegions.rates })
          .from(taxRegions)
          .where(
            and(
              eq(taxRegions.countryCode, tax.countryCode),
              eq(taxRegions.regionCode, tax.regionCode),
              isNull(taxRegions.deletedAt),
            ),
          );
        // A missing region must not block the sale; staff are told to add it. Never awaited: Pay
        // prices while it holds the per-user lock, and the reporter makes a network call.
        if (!region)
          waitUntil(
            reportError(
              new Error(
                `Checkout ${product.name} sold taxed lines with zero tax because tax region ${tax.countryCode}-${tax.regionCode} does not exist. Add the region and its rates in the Taxes module.`,
              ),
              { source: "payments.checkout" },
            ),
          );
        rates = (region?.rates ?? []).map((rate) => ({
          ...rate,
          isIncluded: tax.included,
        }));
      }
      const taxLines = calculateTaxLines(
        quote.lines.map((line, index) => ({
          id: index + 1,
          amountCents: line.quantity * line.unitCents,
          taxes: rates.filter(
            (rate) =>
              line.taxCategory !== undefined &&
              rate.categories.includes(line.taxCategory),
          ),
        })),
      );
      const priced = buildQuote(
        host.currency,
        paymentCount,
        quote.lines.map((line, index) => ({
          kind: line.kind,
          description: line.description,
          quantity: line.quantity,
          unitCents: line.unitCents,
          totalCents: paymentCount === null ? null : taxLines[index].totalCents,
          taxes: taxLines[index].taxes.map((tax) => ({
            id: tax.id,
            code: tax.code,
            name: tax.name,
            rate: Number(tax.ratePercent),
            isIncluded: tax.isIncluded,
            amountCents: tax.amountCents,
          })),
        })),
      );
      // Stripe's bounds for one collection.
      const minimumCents = 50;
      const maximumCents = 99_999_999;
      if (
        [priced.dueNowCents, priced.recurringCents].some(
          (cents) =>
            cents !== null && (cents < minimumCents || cents > maximumCents),
        )
      )
        throw new ReturnedError(
          `Each payment must be between ${formatMoney(minimumCents, { currency: host.currency })} and ${formatMoney(maximumCents, { currency: host.currency })}.`,
        );
      return { paymentCount, quote: priced };
    }

    return {
      session: pipelineStage(
        {
          access: "authenticated",
          schema: z.object({
            id: unsecureIdSchema.optional(),
            choices: product.schema,
          }),
        },
        async ({ data, response, user }) => {
          response.headers.set("Cache-Control", "no-store");
          const { publishableKey } = loadStripeConfig();
          const [order] = data.id
            ? await db
                .select({ id: orders.id, paymentCount: orders.paymentCount })
                .from(orders)
                .where(
                  and(
                    eq(orders.requestId, data.id),
                    eq(orders.userId, user.id),
                  ),
                )
            : [];
          const payment =
            order && (await host.payments.reconcileOrder(order.id));
          // Read after the reconcile: a cancel that lands meanwhile must retire the order.
          const retired =
            order !== undefined &&
            payment?.paymentStatus !== "succeeded" &&
            (
              await db
                .select({ status: orders.status })
                .from(orders)
                .where(eq(orders.id, order.id))
            )[0]?.status === "canceled";
          return response.success<CheckoutSessionResult>({
            publishableKey,
            customerSessionClientSecret:
              await host.payments.createCheckoutCustomerSession(user),
            currency: host.currency,
            returnPath: product.returnPath,
            // A live order shows what was accepted, even after the catalogue changes.
            quote:
              order && !retired
                ? buildQuote(
                    host.currency,
                    order.paymentCount,
                    await loadLines(order.id),
                  )
                : (
                    await priceLines(
                      await product.lines({
                        choices: data.choices,
                        user,
                        connection: db,
                      }),
                      db,
                    )
                  ).quote,
            payment: retired ? undefined : payment,
            retired,
          });
        },
      ),

      pay: pipelineStage(
        {
          access: "authenticated",
          schema: z.object({
            id: unsecureIdSchema,
            choices: product.schema,
            fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
            confirmationTokenId: z.string().startsWith("ctoken_").max(200),
            previousTransactionId: z.number().int().positive().optional(),
          }),
        },
        async ({ data, request, response, user }) => {
          response.headers.set("Cache-Control", "no-store");
          if ((await getFreshCurrentUser())?.id !== user.id)
            throw new ReturnedError("Sign in before paying.", { status: 401 });
          const exceeded = await claimQuota(`${product.name}-checkout`, {
            email: user.email,
          });
          if (exceeded)
            throw new ReturnedError(exceeded.message, { status: 429 });
          const { livemode } = loadStripeConfig({ requireWebhook: true });
          // Reconcile an earlier operation before deciding whether this request may retry it.
          const [existing] = await db
            .select({ id: orders.id })
            .from(orders)
            .where(
              and(eq(orders.requestId, data.id), eq(orders.userId, user.id)),
            );
          const earlier =
            existing && (await host.payments.reconcileOrder(existing.id));
          const linesChanged = new ReturnedError(
            "Your order changed on our side. Review the updated summary before paying.",
            { status: 409, code: "checkout_lines_changed" },
          );
          // This transaction makes no Stripe call and ends before reconciliation, which takes the
          // order lock without the per-user lock.
          const accepted = await db.transaction(async (tx) => {
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`checkout:${user.id}`}))`,
            );
            const [prior] = await tx
              .select()
              .from(orders)
              .where(eq(orders.requestId, data.id))
              .for("update");
            if (prior) {
              if (prior.userId !== user.id)
                throw new ReturnedError("Payment not found.", { status: 404 });
              if (prior.status === "canceled") {
                if (earlier?.paymentStatus === "succeeded") return earlier;
                throw new ReturnedError(
                  "This payment was cancelled. Review the refreshed summary before paying again.",
                  { status: 409, code: "checkout_expired" },
                );
              }
              // Full rows: the reservation hook receives the saved items.
              const items = await tx
                .select()
                .from(orderItems)
                .where(eq(orderItems.orderId, prior.id))
                .orderBy(asc(orderItems.id));
              if (
                buildQuote(host.currency, prior.paymentCount, items)
                  .fingerprint !== data.fingerprint
              )
                throw linesChanged;
              await retryPayment(
                tx,
                prior,
                data.previousTransactionId,
                async () => {
                  await product.reservation?.extend({
                    tx,
                    request,
                    user,
                    order: prior,
                    items,
                  });
                },
              );
              return prior.id;
            }
            const quote = await product.lines({
              choices: data.choices,
              user,
              connection: tx,
            });
            const priced = await priceLines(quote, tx);
            if (priced.quote.fingerprint !== data.fingerprint)
              throw linesChanged;
            const [customer] = await tx
              .select({
                givenName: host.users.givenName,
                familyName: host.users.familyName,
                email: host.users.email,
                addressLine1: host.users.addressLine1,
                addressLine2: host.users.addressLine2,
                locality: host.users.locality,
                regionCode: host.users.regionCode,
                postalCode: host.users.postalCode,
                countryCode: host.users.countryCode,
              })
              .from(host.users)
              .where(eq(host.users.id, user.id));
            if (
              !customer?.givenName ||
              !customer.familyName ||
              (product.requiresAddress &&
                (!customer.addressLine1 ||
                  !customer.locality ||
                  !customer.postalCode ||
                  !customer.countryCode))
            )
              throw new ReturnedError(
                product.requiresAddress
                  ? "Complete your name and mailing address before payment."
                  : "Complete your name before payment.",
                { status: 400 },
              );
            const [order] = await tx
              .insert(orders)
              .values({
                requestId: data.id,
                userId: user.id,
                channel: "website",
                currency: host.currency,
                customerSnapshot: customer,
                paymentCount: priced.paymentCount,
                monthlyCents:
                  priced.paymentCount === null ? priced.quote.totalCents : null,
                coverFees: quote.coverFees,
              })
              .returning();
            const items = await tx
              .insert(orderItems)
              .values(
                priced.quote.lines.map((line) => ({
                  ...line,
                  orderId: order.id,
                })),
              )
              .returning();
            const held = await product.reservation?.hold({
              tx,
              request,
              user,
              customer,
              choices: data.choices,
              quote,
              order,
              items,
            });
            await audit({
              db: tx,
              actor: user,
              action: "payment.accepted",
              table: "transactions",
              rowId: (
                await tx
                  .insert(transactions)
                  .values({
                    orderId: order.id,
                    kind: "payment",
                    instalment: priced.paymentCount === 1 ? null : 1,
                    totalCents: priced.quote.dueNowCents,
                  })
                  .returning({ id: transactions.id })
              )[0].id,
              data: {
                orderId: order.id,
                holdExpiresAt: held?.expiresAt.toISOString(),
                livemode,
              },
            });
            return order.id;
          });
          return response.success<CheckoutPayResult>(
            typeof accepted === "number"
              ? await host.payments.reconcileOrder(accepted, {
                  confirm: {
                    confirmationTokenId: data.confirmationTokenId,
                    returnUrl: `${request.nextUrl.origin}${product.returnPath}?session_id=${data.id}`,
                  },
                })
              : accepted,
          );
        },
      ),

      drop: pipelineStage(
        { access: "authenticated", schema: z.object({ id: unsecureIdSchema }) },
        async ({ data, response, user }) => {
          response.headers.set("Cache-Control", "no-store");
          // The per-user lock makes this wait for an in-flight Pay, so an order about to commit
          // is never reported dropped.
          const [order] = await db.transaction(async (tx) => {
            await tx.execute(
              sql`select pg_advisory_xact_lock(hashtext(${`checkout:${user.id}`}))`,
            );
            return tx
              .select({ id: orders.id })
              .from(orders)
              .where(
                and(eq(orders.requestId, data.id), eq(orders.userId, user.id)),
              );
          });
          if (!order)
            return response.success<CheckoutDropResult>({ outcome: "dropped" });
          await host.payments.reconcileOrder(order.id, { abandon: true });
          // Only rows read after the abandonment decide the outcome; a payment that succeeded
          // while it was in flight is kept.
          const outcome = await db.transaction(async (tx) => {
            const [current] = await tx
              .select({ status: orders.status })
              .from(orders)
              .where(eq(orders.id, order.id))
              .for("update");
            const attempts = await tx
              .select({ status: transactions.status })
              .from(transactions)
              .where(
                and(
                  eq(transactions.orderId, order.id),
                  eq(transactions.kind, "payment"),
                ),
              );
            if (attempts.some(({ status }) => status === "succeeded"))
              return "paid";
            return current?.status === "canceled" &&
              attempts.every(
                ({ status }) => status === "failed" || status === "canceled",
              )
              ? "dropped"
              : "unresolved";
          });
          return response.success<CheckoutDropResult>(
            outcome === "dropped"
              ? { outcome }
              : { outcome, returnPath: product.returnPath },
          );
        },
      ),

      status: pipelineStage(
        {
          access: "authenticated",
          schema: z.object({ sessionId: unsecureIdSchema }),
        },
        async ({ data, response, user }) => {
          response.headers.set("Cache-Control", "no-store");
          const [order] = await db
            .select({ id: orders.id })
            .from(orders)
            .where(
              and(
                eq(orders.requestId, data.sessionId),
                eq(orders.userId, user.id),
              ),
            );
          if (!order)
            throw new ReturnedError("Payment not found.", { status: 404 });
          const payment = await host.payments.reconcileOrder(order.id);
          return response.success<CheckoutStatusResult>({
            ...payment,
            currency: host.currency,
            quote: buildQuote(
              host.currency,
              payment.paymentCount,
              await loadLines(order.id),
            ),
          });
        },
      ),
    };
  };
}
