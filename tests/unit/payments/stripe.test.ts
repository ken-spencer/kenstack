import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/lib/errorReporter", () => ({ reportError: vi.fn() }));
import {
  createStripeWebhook,
  loadStripeConfig,
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

describe("finite monthly payments", () => {
  it("counts the initial Checkout payment and ends after the adjusted twelfth instalment", async () => {
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
      finalPaymentCents: 8337,
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
            duration: { interval: "month", interval_count: 11 },
            items: [{ price: "price_monthly", quantity: 1 }],
            proration_behavior: "none",
          },
          {
            duration: { interval: "month", interval_count: 1 },
            items: [
              {
                price_data: {
                  currency: "cad",
                  product: "prod_seat",
                  recurring: { interval: "month" },
                  unit_amount: 8337,
                },
                quantity: 1,
              },
            ],
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
          finalPaymentCents: 8337,
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
