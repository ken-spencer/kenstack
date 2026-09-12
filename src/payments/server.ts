import "server-only";

// Host payment handlers use the Stripe client and finite billing schedule operation.
import Stripe from "stripe";
import { ReturnedError } from "@kenstack/api/errors";
import { reportError } from "@kenstack/lib/errorReporter";

export function loadStripeConfig() {
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
    try {
      const { stripe, livemode } = loadStripeConfig();
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret)
        throw new Error("Set STRIPE_WEBHOOK_SECRET for the payment webhook.");
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          await request.text(),
          request.headers.get("stripe-signature") ?? "",
          secret,
        );
      } catch {
        return new Response("Invalid signature", { status: 400 });
      }
      if (event.livemode !== livemode)
        return new Response("Wrong payment environment", { status: 400 });
      await onEvent(event, stripe);
      return new Response(null, { status: 200 });
    } catch (error) {
      await reportError(error, { source: "payments.webhook" });
      return new Response("Payment reconciliation failed", { status: 500 });
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

// Host reconciliation persists this provider evidence under its order lock.
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
