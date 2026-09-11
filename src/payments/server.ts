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
    finalPaymentCents,
    idempotencyKey,
  }: {
    subscriptionId: string;
    paymentCount: number;
    finalPaymentCents: number;
    idempotencyKey: string;
  },
) {
  if (
    !Number.isSafeInteger(paymentCount) ||
    paymentCount < 2 ||
    !Number.isSafeInteger(finalPaymentCents) ||
    finalPaymentCents < 1
  ) {
    throw new Error(
      "Instalment scheduling requires at least two payments and a positive final amount in cents.",
    );
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
      "Instalment scheduling requires one subscription item, at least two payments, and a positive final payment.",
    );
  }
  // The first phase starts with the payment already collected by Checkout.
  return stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: "cancel",
      metadata: { installmentPlanKey: idempotencyKey },
      proration_behavior: "none",
      phases: [
        {
          start_date: schedule.phases[0].start_date,
          duration: { interval: "month", interval_count: paymentCount - 1 },
          items: [{ price: item.price.id, quantity: 1 }],
          proration_behavior: "none",
        },
        {
          duration: { interval: "month", interval_count: 1 },
          items: [
            {
              price_data: {
                currency: item.price.currency,
                product:
                  typeof item.price.product === "string"
                    ? item.price.product
                    : item.price.product.id,
                recurring: { interval: "month" },
                unit_amount: finalPaymentCents,
              },
              quantity: 1,
            },
          ],
          proration_behavior: "none",
        },
      ],
    },
    { idempotencyKey: `${idempotencyKey}:configure` },
  );
}
