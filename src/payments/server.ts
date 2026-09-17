import "server-only";

// Host payment handlers use these provider operations alongside createPayments.
import Stripe from "stripe";
import { and, desc, eq } from "drizzle-orm";
import type { DbTransaction } from "@kenstack/db/types";
import { audit } from "@kenstack/logger";
import { orders, transactions } from "./tables";
import { ReturnedError } from "@kenstack/api/errors";
import { reportError } from "@kenstack/lib/errorReporter";

export function loadStripeConfig({ requireWebhook = false } = {}) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey)
    throw new ReturnedError(
      "Online payments are currently unavailable. Please try again later.",
      { status: 503 },
    );
  const livemode = publishableKey.startsWith("pk_live_");
  if (
    (!publishableKey.startsWith("pk_test_") && !livemode) ||
    !["sk", "rk"].some((prefix) =>
      secretKey.startsWith(`${prefix}_${livemode ? "live" : "test"}_`),
    )
  ) {
    throw new Error(
      "Stripe secret and publishable keys must belong to the same test or live environment.",
    );
  }
  if (requireWebhook && livemode && !process.env.STRIPE_WEBHOOK_SECRET)
    throw new ReturnedError(
      "Payments are not configured yet. Please try again later.",
      { status: 503 },
    );
  return {
    stripe: new Stripe(secretKey, { maxNetworkRetries: 2 }),
    publishableKey,
    livemode,
  };
}

export function createStripeWebhook(
  onEvent: (event: Stripe.Event, stripe: Stripe) => Promise<void>,
) {
  return async (request: Request) => {
    const startedAt = performance.now();
    let event: Stripe.Event | undefined;
    let outcome = "failed";
    try {
      const { stripe, livemode } = loadStripeConfig();
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret)
        throw new Error("Set STRIPE_WEBHOOK_SECRET for the payment webhook.");
      try {
        event = stripe.webhooks.constructEvent(
          await request.text(),
          request.headers.get("stripe-signature") ?? "",
          secret,
        );
      } catch {
        outcome = "invalid_signature";
        return new Response("Invalid signature", { status: 400 });
      }
      if (event.livemode !== livemode) {
        outcome = "wrong_environment";
        return new Response("Wrong payment environment", { status: 400 });
      }
      await onEvent(event, stripe);
      outcome = "acknowledged";
      return new Response(null, { status: 200 });
    } catch (error) {
      await reportError(error, {
        source: "payments.webhook",
        context: { eventId: event?.id, eventType: event?.type },
      });
      return new Response("Payment reconciliation failed", { status: 500 });
    } finally {
      // eslint-disable-next-line no-console -- Operational delivery evidence; never log payloads or signatures.
      console.info("payments.webhook", {
        eventId: event?.id,
        eventType: event?.type,
        livemode: event?.livemode,
        outcome,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  };
}

export async function setInstallmentSchedule(
  stripe: Stripe,
  {
    subscriptionId,
    paymentCount,
    idempotencyKey,
  }: {
    subscriptionId: string;
    paymentCount: number;
    idempotencyKey: string;
  },
) {
  if (!Number.isSafeInteger(paymentCount) || paymentCount < 2) {
    throw new Error("Instalment scheduling requires at least two payments.");
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const schedule = subscription.schedule
    ? await stripe.subscriptionSchedules.retrieve(
        typeof subscription.schedule === "string"
          ? subscription.schedule
          : subscription.schedule.id,
      )
    : await stripe.subscriptionSchedules.create(
        { from_subscription: subscriptionId },
        { idempotencyKey: `${idempotencyKey}:create` },
      );
  const item = subscription.items.data[0];
  if (schedule.metadata?.installmentPlanKey === idempotencyKey) return schedule;
  if (
    subscription.items.data.length !== 1 ||
    !item ||
    !schedule.phases[0] ||
    item.quantity !== 1 ||
    item.price.recurring?.interval !== "month" ||
    item.price.recurring.interval_count !== 1
  ) {
    throw new Error(
      "Instalment scheduling requires an existing schedule phase and one subscription item billed monthly with quantity one.",
    );
  }
  // The first phase starts with the initial payment already collected.
  return stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: "cancel",
      metadata: { installmentPlanKey: idempotencyKey },
      proration_behavior: "none",
      phases: [
        {
          start_date: schedule.phases[0].start_date,
          duration: { interval: "month", interval_count: paymentCount },
          items: [{ price: item.price.id, quantity: 1 }],
          proration_behavior: "none",
        },
      ],
    },
    { idempotencyKey: `${idempotencyKey}:configure` },
  );
}

// Reconciliation persists this provider evidence under its order lock.
export async function readPayment(
  stripe: Stripe,
  intentId: string,
  event?: Stripe.Event,
) {
  const intent = await stripe.paymentIntents.retrieve(intentId, {
    expand: ["latest_charge.balance_transaction"],
  });
  const charge =
    typeof intent.latest_charge === "string"
      ? await stripe.charges.retrieve(intent.latest_charge, {
          expand: ["balance_transaction"],
        })
      : intent.latest_charge;
  const balance =
    typeof charge?.balance_transaction === "string"
      ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
      : charge?.balance_transaction;
  if (
    balance &&
    (balance.currency !== intent.currency || balance.amount !== charge?.amount)
  )
    throw new Error(
      "Payment settlement currency or gross amount needs reconciliation.",
    );
  let status: typeof import("@kenstack/payments/tables").transactions.$inferInsert.status;
  switch (intent.status) {
    case "requires_payment_method":
      status = intent.last_payment_error ? "failed" : "pending";
      break;
    case "requires_confirmation":
      status = "pending";
      break;
    case "requires_capture":
    case "processing":
      status = "processing";
      break;
    case "requires_action":
      status = "requires_action";
      break;
    case "succeeded":
      status = "succeeded";
      break;
    case "canceled":
      status = "canceled";
      break;
    default:
      throw new Error("Unrecognized Stripe payment state.");
  }
  let finishedAt: Date | null = null;
  if (event && event.data.object.object === "payment_intent") {
    const observed = event.data.object;
    const observedCharge =
      typeof observed.latest_charge === "string"
        ? observed.latest_charge
        : observed.latest_charge?.id;
    if (
      observed.id === intent.id &&
      observed.status === intent.status &&
      (observedCharge ?? null) === (charge?.id ?? null)
    )
      finishedAt = new Date(event.created * 1000);
  } else if (event?.type === "invoice.paid" && status === "succeeded") {
    const invoice = await stripe.invoices.retrieve(event.data.object.id, {
      expand: ["payments"],
    });
    if (
      invoice.status_transitions.paid_at &&
      invoice.payments?.data.some((payment) => {
        const linked = payment.payment.payment_intent;
        return (typeof linked === "string" ? linked : linked?.id) === intent.id;
      })
    )
      finishedAt = new Date(invoice.status_transitions.paid_at * 1000);
  }
  const funding = charge?.payment_method_details?.card?.funding;
  return {
    intent,
    status,
    finishedAtVerified:
      finishedAt !== null ||
      (status === "canceled" && intent.canceled_at !== null),
    values: {
      status,
      stripePaymentIntentId: intent.id,
      stripeChargeId: charge?.id ?? null,
      stripeBalanceTransactionId: balance?.id ?? null,
      feeCents: balance?.fee ?? null,
      method:
        funding === "credit" || funding === "debit" || funding === "prepaid"
          ? funding
          : charge
            ? "unknown"
            : null,
      errorCode:
        intent.last_payment_error?.decline_code ??
        intent.last_payment_error?.code ??
        null,
      finishedAt:
        status === "succeeded" || status === "failed" || status === "canceled"
          ? intent.status === "canceled" && intent.canceled_at
            ? new Date(intent.canceled_at * 1000)
            : (finishedAt ?? new Date())
          : null,
    } satisfies Partial<
      typeof import("@kenstack/payments/tables").transactions.$inferInsert
    >,
  };
}

export async function readInvoiceLines(
  stripe: Stripe,
  expected: {
    invoiceId: string;
    livemode: boolean;
    currency: string;
    totalCents: number;
    subscriptionId: string | null;
  },
) {
  const invoice = await stripe.invoices.retrieve(expected.invoiceId);
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (
    invoice.livemode !== expected.livemode ||
    invoice.currency !== expected.currency ||
    invoice.status !== "paid" ||
    invoice.amount_paid !== expected.totalCents ||
    (typeof subscription === "string" ? subscription : subscription?.id) !==
      expected.subscriptionId
  )
    return {
      error: `Invoice ${invoice.id} does not match the collected payment.`,
    };
  return {
    lines: (
      await stripe.invoices
        .listLineItems(invoice.id, { limit: 100 })
        .autoPagingToArray({ limit: 10_000 })
    ).map((line) => ({
      description: line.description,
      amountCents: line.amount,
    })),
  };
}

// The caller locks and validates its order, then renews any domain reservation before retrying.
export async function retryPayment(
  tx: DbTransaction,
  order: typeof orders.$inferSelect,
  previousTransactionId: number | undefined,
  beforeRetry: () => Promise<void>,
) {
  const [latest] = await tx
    .select({
      id: transactions.id,
      status: transactions.status,
      instalment: transactions.instalment,
      totalCents: transactions.totalCents,
      stripeInvoiceId: transactions.stripeInvoiceId,
      stripePaymentIntentId: transactions.stripePaymentIntentId,
    })
    .from(transactions)
    .where(
      and(eq(transactions.orderId, order.id), eq(transactions.kind, "payment")),
    )
    .orderBy(desc(transactions.id))
    .limit(1);
  if (!latest) throw new Error("Payment order has no initial collection.");
  if (
    (latest.status !== "failed" && latest.status !== "canceled") ||
    previousTransactionId !== latest.id ||
    (latest.instalment !== null && latest.instalment !== 1)
  )
    return;
  await beforeRetry();
  const [attempt] = await tx
    .insert(transactions)
    .values({
      orderId: order.id,
      kind: "payment",
      instalment: latest.instalment,
      totalCents: latest.totalCents,
      stripeInvoiceId: latest.stripeInvoiceId,
      stripePaymentIntentId: order.stripeSubscriptionId
        ? latest.stripePaymentIntentId
        : null,
    })
    .returning({ id: transactions.id });
  await audit({
    db: tx,
    action: "payment.retry",
    table: "transactions",
    rowId: attempt.id,
    userId: order.userId,
    data: { previousTransactionId: latest.id, orderId: order.id },
  });
}
