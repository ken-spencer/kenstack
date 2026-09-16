import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/lib/errorReporter", () => ({ reportError: vi.fn() }));
import {
  createStripeWebhook,
  loadStripeConfig,
  readPayment,
  setInstallmentSchedule,
} from "@kenstack/payments/server";

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Stripe payment configuration", () => {
  it("rejects mixed test and live credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_live_fixture");
    expect(() => loadStripeConfig()).toThrow("same test or live environment");
  });
});

it("requires a webhook secret before accepting live payments without blocking read-only configuration", () => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture");
  vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_live_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  expect(() => loadStripeConfig({ requireWebhook: true })).toThrow(
    "Payments are not configured yet",
  );
  expect(loadStripeConfig().livemode).toBe(true);
});

describe("finite monthly payments", () => {
  it("counts the initial payment and cancels after twelve months at the existing monthly price", async () => {
    const stripe = new Stripe("sk_test_fixture");
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
      schedule: null,
      items: {
        data: [
          {
            quantity: 1,
            price: {
              id: "price_monthly",
              currency: "cad",
              product: "prod_seat",
              recurring: { interval: "month", interval_count: 1 },
            },
          },
        ],
      },
    } as never);
    vi.spyOn(stripe.subscriptionSchedules, "create").mockResolvedValue({
      id: "sched_seat",
      phases: [{ start_date: 1_800_000_000 }],
    } as never);
    const update = vi
      .spyOn(stripe.subscriptionSchedules, "update")
      .mockResolvedValue({ id: "sched_seat" } as never);
    await setInstallmentSchedule(stripe, {
      subscriptionId: "sub_seat",
      paymentCount: 12,
      idempotencyKey: "order-1",
    });
    expect(update).toHaveBeenCalledWith(
      "sched_seat",
      expect.objectContaining({
        end_behavior: "cancel",
        proration_behavior: "none",
        phases: [
          {
            start_date: 1_800_000_000,
            duration: { interval: "month", interval_count: 12 },
            items: [{ price: "price_monthly", quantity: 1 }],
            proration_behavior: "none",
          },
        ],
      }),
      { idempotencyKey: "order-1:configure" },
    );
  });

  it("does not rewrite a schedule after a retried fulfilment", async () => {
    const stripe = new Stripe("sk_test_fixture");
    vi.spyOn(stripe.subscriptions, "retrieve").mockResolvedValue({
      schedule: "sched_seat",
      items: { data: [] },
    } as never);
    vi.spyOn(stripe.subscriptionSchedules, "retrieve").mockResolvedValue({
      id: "sched_seat",
      metadata: { installmentPlanKey: "order-1" },
    } as never);
    const update = vi.spyOn(stripe.subscriptionSchedules, "update");
    expect(
      (
        await setInstallmentSchedule(stripe, {
          subscriptionId: "sub_seat",
          paymentCount: 12,
          idempotencyKey: "order-1",
        })
      ).id,
    ).toBe("sched_seat");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook boundary", () => {
  function request(livemode = false, tamper = false) {
    const payload = JSON.stringify({
      id: "evt_fixture",
      type: "checkout.session.completed",
      livemode,
      data: { object: { id: "cs_fixture" } },
    });
    const stripe = new Stripe("sk_test_fixture");
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_fixture",
    });
    return new Request("https://example.test/api/stripe/webhook", {
      method: "POST",
      body: tamper ? payload + " " : payload,
      headers: { "stripe-signature": signature },
    });
  }
  it("accepts the signed raw body", async () => {
    const onEvent = vi.fn();
    expect((await createStripeWebhook(onEvent)(request())).status).toBe(200);
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ id: "evt_fixture" }),
      expect.any(Stripe),
    );
  });
  it("rejects altered payloads and events from another payment environment", async () => {
    const onEvent = vi.fn();
    const handler = createStripeWebhook(onEvent);
    expect((await handler(request(false, true))).status).toBe(400);
    expect((await handler(request(true))).status).toBe(400);
    expect(onEvent).not.toHaveBeenCalled();
  });
  it("returns an error so Stripe retries a failed fulfilment", async () => {
    expect(
      (
        await createStripeWebhook(async () => {
          throw new Error("Database unavailable");
        })(request())
      ).status,
    ).toBe(500);
  });
});

describe("provider collection evidence", () => {
  it.each([
    ["requires_confirmation", null, "pending"],
    ["requires_payment_method", null, "pending"],
    ["requires_payment_method", { code: "card_declined" }, "failed"],
    ["requires_action", null, "requires_action"],
    ["processing", null, "processing"],
    ["succeeded", null, "succeeded"],
  ])("maps %s from provider evidence", async (status, error, expected) => {
    const stripe = new Stripe("sk_test_fixture");
    vi.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue({
      id: "pi_test",
      status,
      last_payment_error: error,
      latest_charge: null,
    } as never);
    const before = Date.now();
    const evidence = await readPayment(stripe, "pi_test");
    expect(evidence.status).toBe(expected);
    expect(evidence.values.feeCents).toBeNull();
    if (expected === "succeeded" || expected === "failed") {
      expect(evidence.values.finishedAt?.getTime()).toBeGreaterThanOrEqual(
        before,
      );
    } else expect(evidence.values.finishedAt).toBeNull();
  });
  it("rejects settlement evidence in another currency", async () => {
    const stripe = new Stripe("sk_test_fixture");
    vi.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue({
      currency: "cad",
      latest_charge: {
        amount: 1000,
        balance_transaction: { currency: "usd", amount: 1000, fee: 30 },
      },
    } as never);
    await expect(readPayment(stripe, "pi_test")).rejects.toThrow(
      "settlement currency",
    );
  });
  it("uses the provider cancellation time instead of intent creation", async () => {
    const stripe = new Stripe("sk_test_fixture");
    vi.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue({
      status: "canceled",
      created: 1000,
      canceled_at: 2000,
      latest_charge: null,
    } as never);
    expect((await readPayment(stripe, "pi_test")).values.finishedAt).toEqual(
      new Date(2000000),
    );
  });
});

it("uses the matching payment event's completion time after delayed delivery", async () => {
  const stripe = new Stripe("sk_test_fixture");
  const intent = {
    object: "payment_intent",
    id: "pi_test",
    status: "succeeded",
    latest_charge: null,
  };
  vi.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue(
    intent as never,
  );
  const evidence = await readPayment(stripe, "pi_test", {
    type: "payment_intent.succeeded",
    created: 2000,
    data: { object: intent },
  } as never);
  expect(evidence.values.finishedAt).toEqual(new Date(2000000));
  expect(evidence.finishedAtVerified).toBe(true);
});
it("does not timestamp a new charge with an older charge's event", async () => {
  const stripe = new Stripe("sk_test_fixture");
  vi.spyOn(stripe.paymentIntents, "retrieve").mockResolvedValue({
    id: "pi_test",
    status: "succeeded",
    latest_charge: { id: "ch_new" },
  } as never);
  const evidence = await readPayment(stripe, "pi_test", {
    type: "payment_intent.succeeded",
    created: 2000,
    data: {
      object: {
        object: "payment_intent",
        id: "pi_test",
        status: "succeeded",
        latest_charge: "ch_old",
      },
    },
  } as never);
  expect(evidence.finishedAtVerified).toBe(false);
  expect(evidence.values.finishedAt?.getTime()).toBeGreaterThan(2000000);
});
