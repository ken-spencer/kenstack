import "server-only";
import type Stripe from "stripe";

import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@app/db";
import { createStripeWebhook, readPayment } from "./server";
import { orders, paymentEvents, transactions } from "./tables";
import type { createPayments } from "./reconcile";

export function createPaymentWebhook(
  reconcileOrder: (
    id: number,
    options: { event: Stripe.Event },
  ) => Promise<unknown>,
  onReconciled: Parameters<typeof createPayments>[0]["onReconciled"],
) {
  return createStripeWebhook(async (event, stripe) => {
    const message =
      event.type.startsWith("payment_intent.") &&
      "last_payment_error" in event.data.object
        ? event.data.object.last_payment_error?.message
        : event.type.startsWith("charge.") &&
            "failure_message" in event.data.object
          ? event.data.object.failure_message
          : null;
    await db
      .insert(paymentEvents)
      .values({ id: event.id, type: event.type, message, payload: event })
      .onConflictDoNothing();
    // Logging a duplicate never skips financial effects: an earlier handler may have failed.
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "payment_intent.processing":
      case "payment_intent.requires_action":
      case "payment_intent.canceled": {
        const intent = event.data.object;
        const linked = await stripe.invoicePayments
          .list({
            payment: { type: "payment_intent", payment_intent: intent.id },
            limit: 100,
          })
          .autoPagingToArray({ limit: 10_000 });
        if (linked.length) {
          for (const payment of linked)
            await reconcileInvoice(
              typeof payment.invoice === "string"
                ? payment.invoice
                : payment.invoice.id,
              event,
              stripe,
            );
          break;
        }

        const [order] = await db
          .select({ id: orders.id })
          .from(orders)
          .leftJoin(transactions, eq(transactions.orderId, orders.id))
          .where(
            or(
              eq(transactions.stripePaymentIntentId, intent.id),
              intent.metadata.requestId
                ? eq(orders.requestId, intent.metadata.requestId)
                : undefined,
            ),
          )
          .limit(1);
        if (order) await reconcileOrder(order.id, { event });
        break;
      }
      case "invoice.finalized":
      case "invoice.paid":
      case "invoice.payment_failed":
      case "invoice.payment_action_required": {
        await reconcileInvoice(event.data.object.id, event, stripe);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = await stripe.subscriptions.retrieve(
          event.data.object.id,
        );
        if (subscription.status === "canceled") {
          const schedule = subscription.schedule
            ? await stripe.subscriptionSchedules.retrieve(
                typeof subscription.schedule === "string"
                  ? subscription.schedule
                  : subscription.schedule.id,
              )
            : null;
          const [order] = await db
            .select({
              id: orders.id,
              stripeScheduleId: orders.stripeScheduleId,
            })
            .from(orders)
            .where(eq(orders.stripeSubscriptionId, subscription.id));
          const finishedSchedule =
            schedule ??
            (order?.stripeScheduleId
              ? await stripe.subscriptionSchedules.retrieve(
                  order.stripeScheduleId,
                )
              : null);
          if (order && finishedSchedule?.status !== "completed")
            await db
              .update(orders)
              .set({ status: "canceled" })
              .where(eq(orders.id, order.id));
        }
        break;
      }
    }
  });

  async function reconcileInvoice(
    invoiceId: string,
    event: Stripe.Event,
    stripe: Stripe,
  ) {
    const initial = await stripe.invoices.retrieve(invoiceId);
    const subscription = initial.parent?.subscription_details?.subscription;
    const subscriptionId =
      typeof subscription === "string" ? subscription : subscription?.id;
    if (!subscriptionId) return;
    const subscriptionRecord =
      await stripe.subscriptions.retrieve(subscriptionId);
    const [order] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(
        or(
          eq(orders.stripeSubscriptionId, subscriptionId),
          subscriptionRecord.metadata.requestId
            ? eq(orders.requestId, subscriptionRecord.metadata.requestId)
            : undefined,
        ),
      );
    if (!order) return;
    if (initial.billing_reason === "subscription_create") {
      await reconcileOrder(order.id, { event });
      return;
    }
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({
          id: orders.id,
          currency: orders.currency,
          stripeSubscriptionId: orders.stripeSubscriptionId,
        })
        .from(orders)
        .where(eq(orders.id, order.id))
        .for("update");
      if (
        subscriptionRecord.livemode !== event.livemode ||
        current.stripeSubscriptionId !== subscriptionId
      )
        throw new Error("Invoice subscription does not match the order.");
      const invoice = await stripe.invoices.retrieve(initial.id, {
        expand: ["payments"],
      });
      if (
        invoice.currency !== current.currency ||
        !["subscription_cycle", "subscription_update"].includes(
          invoice.billing_reason ?? "",
        )
      )
        throw new Error("Invoice needs payment reconciliation.");
      const invoices = await stripe.invoices
        .list({ subscription: subscriptionId, limit: 100 })
        .autoPagingToArray({ limit: 10_000 });
      const periods = [
        ...new Set(
          invoices
            .filter(
              (row) =>
                row.billing_reason === "subscription_create" ||
                row.billing_reason === "subscription_cycle",
            )
            .map((row) => row.period_end),
        ),
      ].sort((a, b) => a - b);
      const instalment = periods.indexOf(invoice.period_end) + 1;
      if (instalment < 1)
        throw new Error("Invoice period has no collection number.");
      const payments = await stripe.invoicePayments
        .list({ invoice: invoice.id, limit: 100 })
        .autoPagingToArray({ limit: 10_000 });
      if (!payments.length && invoice.amount_due > 0) {
        const existing = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.orderId, current.id),
              eq(transactions.stripeInvoiceId, invoice.id),
            ),
          )
          .limit(1);
        if (!existing.length)
          await tx.insert(transactions).values({
            orderId: current.id,
            kind: "payment",
            instalment,
            totalCents: invoice.amount_due,
            stripeInvoiceId: invoice.id,
          });
      }
      for (const payment of payments) {
        const intent = payment.payment.payment_intent;
        const intentId = typeof intent === "string" ? intent : intent?.id;
        if (!intentId || payment.payment.type !== "payment_intent")
          throw new Error(
            "Invoice payment requires an explicit non-card mapping.",
          );
        const evidence = await readPayment(stripe, intentId, event);
        if (
          evidence.intent.livemode !== event.livemode ||
          evidence.intent.currency !== current.currency ||
          (evidence.status === "succeeded" &&
            evidence.intent.amount_received !== evidence.intent.amount)
        )
          throw new Error(
            "Invoice collection does not match provider evidence.",
          );
        const rows = await tx
          .select({
            id: transactions.id,
            stripeChargeId: transactions.stripeChargeId,
            status: transactions.status,
            finishedAt: transactions.finishedAt,
          })
          .from(transactions)
          .where(
            and(
              eq(transactions.orderId, current.id),
              eq(transactions.kind, "payment"),
              eq(transactions.stripeInvoiceId, invoice.id),
              or(
                eq(transactions.stripePaymentIntentId, intentId),
                isNull(transactions.stripePaymentIntentId),
              ),
            ),
          )
          .orderBy(asc(transactions.id));
        const matching =
          rows.find(
            (row) =>
              evidence.values.stripeChargeId &&
              row.stripeChargeId === evidence.values.stripeChargeId,
          ) ??
          rows.find(
            (row) =>
              !evidence.values.stripeChargeId &&
              evidence.status === "failed" &&
              !row.stripeChargeId &&
              row.status === "failed",
          ) ??
          rows.find(
            (row) =>
              !row.stripeChargeId &&
              !["succeeded", "failed", "canceled"].includes(row.status),
          );
        if (matching)
          await tx
            .update(transactions)
            .set({
              ...evidence.values,
              finishedAt:
                matching.status === evidence.status &&
                !evidence.finishedAtVerified
                  ? (matching.finishedAt ?? evidence.values.finishedAt)
                  : evidence.values.finishedAt,
            })
            .where(eq(transactions.id, matching.id));
        else
          await tx
            .insert(transactions)
            .values({
              orderId: current.id,
              kind: "payment",
              instalment,
              totalCents: evidence.intent.amount,
              stripeInvoiceId: invoice.id,
              ...evidence.values,
            });
      }
    });
    await onReconciled?.(order.id, stripe, event.livemode);
  }
}
