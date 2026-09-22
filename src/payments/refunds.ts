// Hosts authorize staff refunds; this owner preserves financial evidence and idempotency.
import "server-only";

import type Stripe from "stripe";
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@app/db";
import { ReturnedError } from "@kenstack/api/errors";
import { auditLogs } from "@kenstack/db/tables/audit";
import type { DbTransaction } from "@kenstack/db/types";
import { audit } from "@kenstack/logger";
import { reportError } from "@kenstack/lib/errorReporter";
import { idempotencyReplayWindowMs, loadStripeConfig } from "./server";
import { finishedTransactionStatuses, orders, transactions } from "./tables";

export function createRefunds(config: {
  onRefunded?: (context: {
    tx: DbTransaction;
    order: typeof orders.$inferSelect;
    refund: typeof transactions.$inferSelect;
  }) => Promise<void>;
}) {
  async function refundPayment(input: {
    orderId: number;
    transactionId: number;
    requestId: string;
    userId: number;
    reason: string;
  }) {
    if (!/^[a-z0-9]{15}$/i.test(input.requestId) || !input.reason.trim()) {
      throw new ReturnedError(
        "A refund request ID and staff reason are required.",
      );
    }
    const { stripe, livemode } = loadStripeConfig({ requireWebhook: true });
    const accepted = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .for("update");
      if (!order) throw new ReturnedError("Order not found.", { status: 404 });
      const [payment] = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.id, input.transactionId),
            eq(transactions.orderId, order.id),
            eq(transactions.kind, "payment"),
          ),
        );
      if (
        !payment ||
        payment.status !== "succeeded" ||
        !payment.stripeChargeId ||
        !payment.stripePaymentIntentId ||
        order.paymentCount !== 1
      ) {
        throw new ReturnedError(
          "This payment requires staff review before a refund can be issued.",
        );
      }
      const refunds = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.originalTransactionId, payment.id),
            eq(transactions.kind, "refund"),
          ),
        )
        .orderBy(asc(transactions.id));
      if (refunds.length) {
        const requests = await tx
          .select({ rowId: auditLogs.rowId, data: auditLogs.data })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.table, "transactions"),
              eq(auditLogs.action, "refund.requested"),
              inArray(
                auditLogs.rowId,
                refunds.map((refund) => refund.id),
              ),
            ),
          );
        const previous =
          refunds.find((refund) =>
            requests.some(
              (request) =>
                request.rowId === refund.id &&
                request.data?.requestId === input.requestId,
            ),
          ) ??
          refunds.find(
            (refund) => !["failed", "canceled"].includes(refund.status),
          );
        if (previous)
          return {
            refund: previous,
            order,
            chargeId: payment.stripeChargeId,
            submit: false,
          };
      }
      const charge = await stripe.charges.retrieve(payment.stripeChargeId);
      if (
        charge.livemode !== livemode ||
        charge.currency !== order.currency ||
        charge.amount !== payment.totalCents ||
        charge.amount_captured !== payment.totalCents ||
        charge.status !== "succeeded" ||
        charge.disputed ||
        charge.amount_refunded !== 0 ||
        (typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id) !== payment.stripePaymentIntentId
      )
        throw new ReturnedError(
          "The charge has changed or needs review before it can be refunded.",
        );
      const providerRefunds = await stripe.refunds
        .list({ charge: charge.id, limit: 100 })
        .autoPagingToArray({ limit: 10_000 });
      if (
        providerRefunds.some(
          (refund) =>
            refund.status !== "failed" && refund.status !== "canceled",
        )
      ) {
        throw new ReturnedError(
          "An existing Stripe refund needs reconciliation before another can be issued.",
        );
      }
      const [refund] = await tx
        .insert(transactions)
        .values({
          orderId: order.id,
          originalTransactionId: payment.id,
          kind: "refund",
          totalCents: -payment.totalCents,
          method: payment.method,
        })
        .returning();
      await audit({
        db: tx,
        userId: input.userId,
        action: "refund.requested",
        table: "transactions",
        rowId: refund.id,
        data: {
          orderId: order.id,
          originalTransactionId: payment.id,
          requestId: input.requestId,
          reason: input.reason.trim(),
          livemode,
        },
      });
      // Commit the marker before the network request; an interrupted response must never permit a new refund.
      await audit({
        db: tx,
        userId: input.userId,
        action: "refund.provider_started",
        table: "transactions",
        rowId: refund.id,
        data: { orderId: order.id },
      });
      return { refund, order, chargeId: charge.id, submit: true };
    });

    if (accepted.submit) {
      return reconcileRefund(accepted.refund.id, {
        providerRefundId: (
          await submitRefund(
            stripe,
            accepted.order,
            accepted.refund,
            accepted.chargeId,
            input.requestId,
          ).catch((error) => reportRefundFailure(accepted.refund.id, error))
        ).id,
      });
    }
    return reconcileRefund(accepted.refund.id, {
      retryRequestId: input.requestId,
    });
  }

  async function reconcileRefund(
    id: number,
    options: {
      providerRefundId?: string;
      event?: Stripe.Event;
      retryRequestId?: string;
    } = {},
  ) {
    const { stripe, livemode } = loadStripeConfig();
    const [linked] = await db
      .select({ orderId: transactions.orderId })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.kind, "refund")));
    if (!linked) throw new ReturnedError("Refund not found.", { status: 404 });
    let providerFailed = false;
    let reviewRequired = false;
    const result = await db
      .transaction(async (tx) => {
        const [order] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, linked.orderId))
          .for("update");
        const [refund] = await tx
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.id, id),
              eq(transactions.orderId, order.id),
              eq(transactions.kind, "refund"),
            ),
          );
        if (!refund?.originalTransactionId)
          throw new Error("Refund has no original payment.");
        const [payment] = await tx
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.id, refund.originalTransactionId),
              eq(transactions.orderId, order.id),
              eq(transactions.kind, "payment"),
            ),
          );
        const [request] = await tx
          .select({ data: auditLogs.data })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.table, "transactions"),
              eq(auditLogs.rowId, refund.id),
              eq(auditLogs.action, "refund.requested"),
            ),
          );
        if (
          !payment?.stripeChargeId ||
          !payment.stripePaymentIntentId ||
          payment.status !== "succeeded" ||
          typeof request?.data?.requestId !== "string" ||
          request.data.livemode !== livemode ||
          (options.event && options.event.livemode !== livemode)
        ) {
          throw new Error(
            "Refund does not match an accepted payment and environment.",
          );
        }
        let charge = await stripe.charges.retrieve(payment.stripeChargeId);
        if (
          charge.livemode !== livemode ||
          charge.currency !== order.currency ||
          charge.amount_captured !== payment.totalCents ||
          charge.amount !== payment.totalCents ||
          charge.status !== "succeeded" ||
          charge.disputed ||
          (typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id) !== payment.stripePaymentIntentId
        ) {
          throw new Error("Refund charge does not match the original payment.");
        }
        let providerId = options.providerRefundId ?? refund.stripeRefundId;
        if (
          options.providerRefundId &&
          refund.stripeRefundId &&
          options.providerRefundId !== refund.stripeRefundId
        ) {
          throw new Error("Refund provider identity has changed.");
        }
        if (!providerId) {
          const found = (
            await stripe.refunds
              .list({ charge: charge.id, limit: 100 })
              .autoPagingToArray({ limit: 10_000 })
          ).filter(
            (row) => row.metadata?.refundTransactionId === String(refund.id),
          );
          if (found.length > 1)
            throw new Error(
              "Multiple Stripe refunds claim the same transaction.",
            );
          providerId = found[0]?.id ?? null;
        }
        // Only an explicit retry of the same staff request may replay the original key,
        // inside Stripe's idempotency retention window. A webhook never submits money.
        if (
          !providerId &&
          options.retryRequestId === request.data.requestId &&
          refund.status === "pending" &&
          Date.now() - refund.createdAt.getTime() < idempotencyReplayWindowMs
        ) {
          providerId = (
            await submitRefund(
              stripe,
              order,
              refund,
              charge.id,
              request.data.requestId,
            ).catch((error) => {
              providerFailed = true;
              throw error;
            })
          ).id;
          charge = await stripe.charges.retrieve(payment.stripeChargeId);
        }
        // After the safe replay window an empty listing cannot authorize a new request.
        if (!providerId) {
          if (
            refund.status === "pending" &&
            Date.now() - refund.createdAt.getTime() >= idempotencyReplayWindowMs
          ) {
            reviewRequired = true;
            await audit({
              db: tx,
              userId: null,
              action: "refund.review_required",
              table: "transactions",
              rowId: refund.id,
              data: { reason: "provider_unknown", orderId: order.id },
            });
          }
          return {
            id: refund.id,
            orderId: order.id,
            status: refund.status,
            totalCents: refund.totalCents,
          };
        }
        const provider = await stripe.refunds.retrieve(providerId, {
          expand: ["balance_transaction", "failure_balance_transaction"],
        });
        if (
          (typeof provider.charge === "string"
            ? provider.charge
            : provider.charge?.id) !== charge.id ||
          (typeof provider.payment_intent === "string"
            ? provider.payment_intent
            : provider.payment_intent?.id) !== payment.stripePaymentIntentId ||
          provider.amount !== payment.totalCents ||
          provider.amount !== -refund.totalCents ||
          provider.currency !== order.currency ||
          provider.metadata?.orderId !== String(order.id) ||
          provider.metadata?.requestId !== order.requestId ||
          provider.metadata?.refundRequestId !== request.data.requestId ||
          provider.metadata?.refundTransactionId !== String(refund.id) ||
          provider.metadata?.originalTransactionId !== String(payment.id)
        )
          throw new Error(
            "Stripe refund evidence does not match the accepted refund.",
          );
        const status = provider.status;
        if (
          status !== "pending" &&
          status !== "requires_action" &&
          status !== "succeeded" &&
          status !== "failed" &&
          status !== "canceled"
        )
          throw new Error("Refund status needs reconciliation.");
        if (
          status === "succeeded" &&
          charge.amount_refunded !== payment.totalCents
        )
          throw new Error(
            "The full refund has not been confirmed on the charge.",
          );
        const balance =
          typeof provider.balance_transaction === "string"
            ? await stripe.balanceTransactions.retrieve(
                provider.balance_transaction,
              )
            : provider.balance_transaction;
        const failureBalance =
          typeof provider.failure_balance_transaction === "string"
            ? await stripe.balanceTransactions.retrieve(
                provider.failure_balance_transaction,
              )
            : provider.failure_balance_transaction;
        for (const evidence of [balance, failureBalance]) {
          if (
            evidence &&
            (evidence.currency !== order.currency ||
              (typeof evidence.source === "string"
                ? evidence.source
                : evidence.source?.id) !== provider.id ||
              evidence.amount !==
                (evidence === balance ? -provider.amount : provider.amount))
          ) {
            throw new Error(
              "Refund balance evidence does not match the refund.",
            );
          }
        }
        const [updated] = await tx
          .update(transactions)
          .set({
            status,
            stripeRefundId: provider.id,
            stripeBalanceTransactionId: balance?.id ?? null,
            feeCents: balance ? balance.fee + (failureBalance?.fee ?? 0) : null,
            errorCode: provider.failure_reason ?? null,
            finishedAt: finishedTransactionStatuses.includes(status)
              ? refund.status === status && refund.finishedAt
                ? refund.finishedAt
                : new Date()
              : null,
          })
          .where(eq(transactions.id, refund.id))
          .returning();
        await audit({
          db: tx,
          userId: null,
          action: "refund.reconciled",
          table: "transactions",
          rowId: refund.id,
          data: {
            status,
            stripeRefundId: provider.id,
            failureBalanceTransactionId: failureBalance?.id ?? null,
            eventId: options.event?.id ?? null,
          },
        });
        if (status === "succeeded")
          await config.onRefunded?.({ tx, order, refund: updated });
        return {
          id: updated.id,
          orderId: order.id,
          status: updated.status,
          totalCents: updated.totalCents,
        };
      })
      .catch((error) => {
        // Release the transaction connection before a durable error audit needs another one.
        if (providerFailed) return reportRefundFailure(id, error);
        throw error;
      });
    if (reviewRequired) {
      await reportError(
        new Error(
          `Refund ${id} for order ${linked.orderId} is still unknown after the safe retry window.`,
        ),
        {
          source: "payments.refund",
          context: { refundId: id, orderId: linked.orderId },
        },
      );
      throw new ReturnedError(
        "This refund needs staff review in Stripe before another refund can be requested. Its outcome is still unknown.",
        { status: 409 },
      );
    }
    return result;
  }

  async function reconcileRefundEvent(event: Stripe.Event, stripe: Stripe) {
    // These only route the event; reconcileRefund reads current evidence under the order lock.
    for (const provider of event.data.object.object === "refund"
      ? [event.data.object]
      : event.type === "charge.refunded"
        ? await stripe.refunds
            .list({ charge: event.data.object.id, limit: 100 })
            .autoPagingToArray({ limit: 10_000 })
        : []) {
      const transactionId = Number(provider.metadata?.refundTransactionId);
      const [refund] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.kind, "refund"),
            Number.isSafeInteger(transactionId) && transactionId > 0
              ? eq(transactions.id, transactionId)
              : eq(transactions.stripeRefundId, provider.id),
          ),
        );
      if (refund)
        await reconcileRefund(refund.id, {
          providerRefundId: provider.id,
          event,
        });
      else {
        const chargeId =
          typeof provider.charge === "string"
            ? provider.charge
            : provider.charge?.id;
        if (!chargeId) continue;
        const [payment] = await db
          .select({ id: transactions.id, orderId: transactions.orderId })
          .from(transactions)
          .where(
            and(
              eq(transactions.kind, "payment"),
              eq(transactions.stripeChargeId, chargeId),
            ),
          );
        if (!payment) continue;
        await audit({
          userId: null,
          action: "refund.review_required",
          table: "transactions",
          rowId: payment.id,
          data: {
            reason: "external_refund",
            orderId: payment.orderId,
            stripeRefundId: provider.id,
            amountCents: provider.amount,
            status: provider.status,
            eventId: event.id,
          },
        });
        await reportError(
          new Error(
            `Stripe refund ${provider.id} for order ${payment.orderId} has no local refund record and needs reconciliation.`,
          ),
          {
            source: "payments.refund",
            context: {
              orderId: payment.orderId,
              transactionId: payment.id,
              stripeRefundId: provider.id,
            },
          },
        );
      }
    }
  }

  return { refundPayment, reconcileRefund, reconcileRefundEvent };
}

function submitRefund(
  stripe: Stripe,
  order: typeof orders.$inferSelect,
  refund: typeof transactions.$inferSelect,
  chargeId: string,
  requestId: string,
) {
  return stripe.refunds.create(
    {
      charge: chargeId,
      amount: -refund.totalCents,
      metadata: {
        orderId: String(order.id),
        requestId: order.requestId,
        refundRequestId: requestId,
        refundTransactionId: String(refund.id),
        originalTransactionId: String(refund.originalTransactionId),
      },
    },
    { idempotencyKey: `order:${order.requestId}:refund:${refund.id}` },
  );
}

async function reportRefundFailure(id: number, error: unknown): Promise<never> {
  await audit({
    userId: null,
    action: "refund.provider_error",
    table: "transactions",
    rowId: id,
    data: {
      message:
        error instanceof Error ? error.message : "Unknown refund response",
    },
  });
  throw new ReturnedError(
    "Stripe did not confirm the refund. Keep this request and retry its status check.",
    { status: 503 },
  );
}
