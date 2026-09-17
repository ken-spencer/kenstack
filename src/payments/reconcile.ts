// Host applications configure account linkage and fulfillment once for every payment route.
import "server-only";

import Stripe from "stripe";
import { and, asc, desc, eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@app/db";
import type { DbTransaction, NumericIdTable } from "@kenstack/db/types";
import { audit } from "@kenstack/logger";
import { auditLogs } from "@kenstack/db/tables/audit";
import { ReturnedError } from "@kenstack/api";
import { orders, orderItems, transactions } from "./tables";
import {
  loadStripeConfig,
  readPayment,
  setInstallmentSchedule,
} from "./server";
import { calculateInstallments } from "./installments";
import { createPaymentWebhook } from "./webhook";

export function createPayments(config: {
  users: NumericIdTable & {
    stripeCustomerId: AnyPgColumn<{ data: string; notNull: false }>;
  };
  customer: { metadataKey: string; idempotencyPrefix: string };
  prepareOrder?: (context: {
    tx: DbTransaction;
    order: typeof orders.$inferSelect;
    items: (typeof orderItems.$inferSelect)[];
    options: { expire?: boolean; abandon?: boolean };
  }) => Promise<{
    expire?: boolean;
    installmentDescription?: string;
    settle: (status: "succeeded" | "canceled") => Promise<void>;
  }>;
  onReconciled?: (
    id: number,
    stripe: Stripe,
    livemode: boolean,
  ) => Promise<void> | void;
}) {
  const { users } = config;
  async function reconcileOrder(
    id: number,
    options: {
      confirm?: { confirmationTokenId: string; returnUrl: string };
      expire?: boolean;
      abandon?: boolean;
      event?: Stripe.Event;
    } = {},
  ) {
    const pay = options.confirm;
    let expire = options.abandon || options.expire || false;
    const { stripe, livemode } = loadStripeConfig();
    if (pay) {
      await db.transaction(async (tx) => {
        const [order] = await tx
          .select({ status: orders.status, userId: orders.userId })
          .from(orders)
          .where(eq(orders.id, id))
          .for("update");
        if (order?.status !== "active") return;
        const [attempt] = await tx
          .select({ id: transactions.id, status: transactions.status })
          .from(transactions)
          .where(
            and(eq(transactions.orderId, id), eq(transactions.kind, "payment")),
          )
          .orderBy(desc(transactions.id))
          .limit(1);
        if (attempt?.status === "pending")
          await audit({
            db: tx,
            action: "payment.provider_started",
            table: "transactions",
            rowId: attempt.id,
            userId: order.userId,
            data: { orderId: id },
          });
      });
    }
    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("update");
      if (!order)
        throw new ReturnedError("Payment not found.", { status: 404 });
      const items = await tx
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
        .orderBy(asc(orderItems.id));
      const attempts = await tx
        .select()
        .from(transactions)
        .where(
          and(eq(transactions.orderId, id), eq(transactions.kind, "payment")),
        )
        .orderBy(asc(transactions.id));
      let attempt = attempts
        .filter((row) => row.instalment === null || row.instalment === 1)
        .at(-1);
      if (!attempt) throw new Error("Payment order has no initial collection.");
      const prepared = await config.prepareOrder?.({
        tx,
        order,
        items,
        options,
      });
      if (prepared?.expire !== undefined) expire = prepared.expire;
      const recurring = order.paymentCount !== 1;
      if (
        attempts.some(
          (row) =>
            (row.instalment === null || row.instalment === 1) &&
            row.status === "succeeded",
        )
      )
        expire = false;
      let intentId = attempt.stripePaymentIntentId;
      let clientSecret: string | null = null;
      if (!intentId && attempt.status === "pending") {
        if (recurring) {
          if (!order.stripeSubscriptionId) {
            for await (const subscription of stripe.subscriptions.list({
              status: "all",
              created: {
                gte: Math.floor(order.createdAt.getTime() / 1000) - 60,
              },
              limit: 100,
            })) {
              if (
                subscription.metadata.orderId === String(id) &&
                subscription.metadata.requestId === order.requestId
              ) {
                order.stripeSubscriptionId = subscription.id;
                await tx
                  .update(orders)
                  .set({ stripeSubscriptionId: subscription.id })
                  .where(eq(orders.id, id));
                break;
              }
            }
          }
          if (order.stripeSubscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(
              order.stripeSubscriptionId,
              { expand: ["latest_invoice.payments"] },
            );
            const invoice =
              typeof subscription.latest_invoice === "string"
                ? await stripe.invoices.retrieve(subscription.latest_invoice, {
                    expand: ["payments"],
                  })
                : subscription.latest_invoice;
            const payment = invoice?.payments?.data.find(
              (row) => row.payment.type === "payment_intent",
            )?.payment.payment_intent;
            intentId =
              typeof payment === "string" ? payment : (payment?.id ?? null);
            if (invoice && intentId) attempt.stripeInvoiceId = invoice.id;
          }
        } else {
          for await (const intent of stripe.paymentIntents.list({
            created: {
              gte: Math.floor(attempt.createdAt.getTime() / 1000) - 60,
            },
            limit: 100,
          })) {
            if (
              intent.metadata.orderId === String(id) &&
              intent.metadata.requestId === order.requestId &&
              intent.metadata.transactionId === String(attempt.id)
            ) {
              intentId = intent.id;
              break;
            }
          }
        }
        if (intentId)
          await tx
            .update(transactions)
            .set({
              stripePaymentIntentId: intentId,
              stripeInvoiceId: attempt.stripeInvoiceId,
            })
            .where(eq(transactions.id, attempt.id));
      }
      if (
        pay &&
        order.status === "active" &&
        attempt.status === "pending" &&
        !intentId
      ) {
        // Never reuse a pruned Stripe idempotency key for a possibly accepted operation.
        if (attempt.createdAt.getTime() < Date.now() - 23 * 60 * 60_000)
          throw new ReturnedError(
            "This payment needs reconciliation before another charge can be attempted. Please contact the office.",
            { status: 409 },
          );
        if (order.userId === null) throw new Error("Payment has no account.");
        const [user] = await tx
          .select({ stripeCustomerId: users.stripeCustomerId })
          .from(users)
          .where(eq(users.id, order.userId))
          .for("update");
        if (!user) throw new Error("Payment account is missing.");
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          // Recover a customer whose create response was lost before its local link committed.
          for await (const customer of stripe.customers.list({
            email: order.customerSnapshot.email,
            limit: 100,
          })) {
            if (
              customer.metadata[config.customer.metadataKey] ===
              String(order.userId)
            ) {
              customerId = customer.id;
              break;
            }
          }
          customerId ??= (
            await stripe.customers.create(
              {
                email: order.customerSnapshot.email,
                name: `${order.customerSnapshot.givenName} ${order.customerSnapshot.familyName}`,
                metadata: {
                  [config.customer.metadataKey]: String(order.userId),
                },
              },
              {
                idempotencyKey: `${config.customer.idempotencyPrefix}:${order.userId}:${order.requestId}`,
              },
            )
          ).id;
          await tx
            .update(users)
            .set({ stripeCustomerId: customerId })
            .where(eq(users.id, order.userId));
        }
        const metadata = {
          orderId: String(order.id),
          requestId: order.requestId,
          transactionId: String(attempt.id),
        };
        if (recurring) {
          const subscriptionItems: Stripe.SubscriptionCreateParams.Item[] = [];
          const invoiceItems: Stripe.SubscriptionCreateParams.AddInvoiceItem[] =
            [];
          for (const [index, item] of (order.paymentCount === null
            ? items
            : [
                {
                  description:
                    prepared?.installmentDescription ??
                    items.map((item) => item.description).join(", "),
                  unitCents: calculateInstallments(
                    items.reduce(
                      (sum, item) => sum + (item.totalCents ?? 0),
                      0,
                    ),
                    order.paymentCount,
                  ).monthlyPaymentCents,
                },
              ]
          ).entries()) {
            const product = await stripe.products.create(
              { name: item.description, metadata: { orderId: String(id) } },
              { idempotencyKey: `order:${order.requestId}:product:${index}` },
            );
            subscriptionItems.push({
              price_data: {
                currency: order.currency,
                product: product.id,
                unit_amount: item.unitCents,
                recurring: { interval: "month" },
              },
              quantity: 1,
            });
            if (order.paymentCount !== null) {
              const remainder = attempt.totalCents - item.unitCents;
              if (remainder > 0)
                invoiceItems.push({
                  price_data: {
                    currency: order.currency,
                    product: product.id,
                    unit_amount: remainder,
                  },
                  quantity: 1,
                });
            }
          }
          const subscription = order.stripeSubscriptionId
            ? await stripe.subscriptions.retrieve(order.stripeSubscriptionId, {
                expand: ["latest_invoice.payments"],
              })
            : await stripe.subscriptions.create(
                {
                  customer: customerId,
                  items: subscriptionItems,
                  add_invoice_items: invoiceItems,
                  payment_behavior: "default_incomplete",
                  payment_settings: {
                    payment_method_types: ["card"],
                    save_default_payment_method: "on_subscription",
                  },
                  metadata,
                  expand: ["latest_invoice.payments"],
                },
                { idempotencyKey: `order:${order.requestId}:subscription` },
              );
          if (
            subscription.livemode !== livemode ||
            subscription.metadata.orderId !== String(id) ||
            subscription.metadata.requestId !== order.requestId
          )
            throw new Error("Subscription does not match the order.");
          order.stripeSubscriptionId = subscription.id;
          await tx
            .update(orders)
            .set({ stripeSubscriptionId: subscription.id })
            .where(eq(orders.id, id));
          const invoice =
            typeof subscription.latest_invoice === "string"
              ? await stripe.invoices.retrieve(subscription.latest_invoice, {
                  expand: ["payments"],
                })
              : subscription.latest_invoice;
          const payment = invoice?.payments?.data.find(
            (row) => row.payment.type === "payment_intent",
          )?.payment.payment_intent;
          intentId =
            typeof payment === "string" ? payment : (payment?.id ?? null);
          if (
            !intentId ||
            !invoice ||
            invoice.amount_due !== attempt.totalCents ||
            invoice.currency !== order.currency
          )
            throw new Error(
              "Initial subscription invoice does not match the accepted payment.",
            );
          attempt.stripeInvoiceId = invoice.id;
        } else {
          intentId = (
            await stripe.paymentIntents.create(
              {
                amount: attempt.totalCents,
                currency: order.currency,
                customer: customerId,
                payment_method_types: ["card"],
                metadata,
              },
              {
                idempotencyKey: `order:${order.requestId}:transaction:${attempt.id}:create`,
              },
            )
          ).id;
        }
        await tx
          .update(transactions)
          .set({
            stripePaymentIntentId: intentId,
            stripeInvoiceId: attempt.stripeInvoiceId,
          })
          .where(eq(transactions.id, attempt.id));
      }
      if (expire && !intentId) {
        const started = await tx
          .select({ id: auditLogs.id })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.table, "transactions"),
              eq(auditLogs.rowId, attempt.id),
              eq(auditLogs.action, "payment.provider_started"),
            ),
          )
          .limit(1);
        if (!started.length && attempt.status === "pending") {
          const [canceled] = await tx
            .update(transactions)
            .set({ status: "canceled", finishedAt: new Date() })
            .where(eq(transactions.id, attempt.id))
            .returning();
          attempt = canceled;
          await tx
            .update(orders)
            .set({ status: "canceled" })
            .where(eq(orders.id, id));
          await prepared?.settle("canceled");
        }
      }
      if (intentId) {
        let evidence = await readPayment(stripe, intentId, options.event);
        if (
          evidence.intent.livemode !== livemode ||
          evidence.intent.currency !== order.currency ||
          evidence.intent.amount !== attempt.totalCents
        )
          throw new Error(
            "Stripe payment does not match the accepted collection.",
          );
        if (
          !recurring &&
          (evidence.intent.metadata.orderId !== String(id) ||
            evidence.intent.metadata.requestId !== order.requestId ||
            evidence.intent.metadata.transactionId !== String(attempt.id))
        )
          throw new Error(
            "Stripe payment identity does not match the collection.",
          );
        if (
          pay &&
          order.status === "active" &&
          attempt.status === "pending" &&
          ["requires_confirmation", "requires_payment_method"].includes(
            evidence.intent.status,
          )
        ) {
          try {
            await stripe.paymentIntents.confirm(
              intentId,
              {
                confirmation_token: pay.confirmationTokenId,
                return_url: pay.returnUrl,
              },
              {
                idempotencyKey: `order:${order.requestId}:transaction:${attempt.id}:confirm`,
              },
            );
          } catch (error) {
            if (!(error instanceof Stripe.errors.StripeCardError)) throw error;
          }
          evidence = await readPayment(stripe, intentId, options.event);
        }
        if (expire && evidence.status !== "succeeded") {
          if (evidence.intent.status !== "canceled") {
            try {
              // Invoice-owned PaymentIntents must be canceled by voiding the invoice.
              if (attempt.stripeInvoiceId)
                await stripe.invoices.voidInvoice(attempt.stripeInvoiceId);
              else await stripe.paymentIntents.cancel(intentId);
            } catch (error) {
              const current = await readPayment(
                stripe,
                intentId,
                options.event,
              );
              if (
                current.status !== "succeeded" &&
                current.status !== "canceled"
              )
                throw error;
            }
          }
          evidence = await readPayment(stripe, intentId, options.event);
          // Authentication can succeed while cancellation is in flight.
          if (evidence.status === "canceled" && order.stripeSubscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(
              order.stripeSubscriptionId,
            );
            if (
              subscription.status !== "canceled" &&
              subscription.status !== "incomplete_expired"
            )
              await stripe.subscriptions.cancel(order.stripeSubscriptionId);
          }
        }
        if (
          evidence.status === "succeeded" &&
          evidence.intent.amount_received !== attempt.totalCents
        )
          throw new Error(
            "Received payment amount does not match the collection.",
          );
        const priorCharge = evidence.values.stripeChargeId
          ? attempts.find(
              (row) => row.stripeChargeId === evidence.values.stripeChargeId,
            )
          : undefined;
        // A new attempt must not take the previous attempt's failed charge reference.
        if (!priorCharge || priorCharge.id === attempt.id) {
          if (
            recurring &&
            (attempt.status === "failed" || attempt.status === "canceled") &&
            evidence.values.stripeChargeId &&
            evidence.values.stripeChargeId !== attempt.stripeChargeId
          ) {
            const [created] = await tx
              .insert(transactions)
              .values({
                orderId: id,
                kind: "payment",
                instalment: 1,
                totalCents: attempt.totalCents,
                stripeInvoiceId: attempt.stripeInvoiceId,
                ...evidence.values,
              })
              .returning();
            attempt = created;
          } else if (
            !["succeeded", "failed", "canceled"].includes(attempt.status) ||
            evidence.status === attempt.status
          ) {
            const [updated] = await tx
              .update(transactions)
              .set({
                ...evidence.values,
                finishedAt:
                  attempt.status === evidence.status &&
                  !evidence.finishedAtVerified
                    ? (attempt.finishedAt ?? evidence.values.finishedAt)
                    : evidence.values.finishedAt,
              })
              .where(eq(transactions.id, attempt.id))
              .returning();
            attempt = updated;
          }
        }
        if (expire && evidence.status === "canceled") {
          await tx
            .update(orders)
            .set({ status: "canceled" })
            .where(eq(orders.id, id));
          await prepared?.settle("canceled");
        }
        clientSecret =
          evidence.status === "requires_action"
            ? evidence.intent.client_secret
            : null;
      }
      const paid =
        attempt.status === "succeeded" ||
        attempts.some(
          (row) =>
            (row.instalment === null || row.instalment === 1) &&
            row.status === "succeeded",
        );
      if (paid) {
        if (
          order.paymentCount !== null &&
          order.paymentCount > 1 &&
          !order.stripeScheduleId
        ) {
          if (!order.stripeSubscriptionId)
            throw new Error("Finite payment plan has no subscription.");
          const schedule = await setInstallmentSchedule(stripe, {
            subscriptionId: order.stripeSubscriptionId,
            paymentCount: order.paymentCount,
            idempotencyKey: `order:${order.requestId}:schedule`,
          });
          await tx
            .update(orders)
            .set({ stripeScheduleId: schedule.id })
            .where(eq(orders.id, id));
        }
        await prepared?.settle("succeeded");
      }
      return {
        id: order.id,
        sessionId: order.requestId,
        transactionId: attempt.id,
        paymentStatus: paid ? ("succeeded" as const) : attempt.status,
        amountCents: attempt.totalCents,
        paymentCount: order.paymentCount,
        livemode,
        items: items.map((item) => ({
          kind: item.kind,
          description: item.description,
        })),
        clientSecret,
      };
    });
    if (result.paymentStatus === "succeeded")
      await config.onReconciled?.(id, stripe, livemode);
    return result;
  }

  return {
    reconcileOrder,
    stripeWebhook: createPaymentWebhook(reconcileOrder, config.onReconciled),
  };
}
