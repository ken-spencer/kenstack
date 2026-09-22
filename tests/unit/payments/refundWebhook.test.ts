import type Stripe from "stripe";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  createStripeWebhook: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({ db: { insert: mocks.insert } }));
vi.mock("@kenstack/payments/server", () => ({
  createStripeWebhook: mocks.createStripeWebhook,
  readPayment: vi.fn(),
}));

import { createPaymentWebhook } from "@kenstack/payments/webhook";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insert.mockReturnValue({
    values: () => ({ onConflictDoNothing: async () => [] }),
  });
});

it.each([
  "refund.created",
  "refund.updated",
  "refund.failed",
  "charge.refunded",
])(
  "reconciles %s even when the verified event was already logged",
  async (type) => {
    const onRefundEvent = vi.fn();
    createPaymentWebhook(vi.fn(), undefined, onRefundEvent);
    const event = {
      id: "evt_refund",
      type,
      data: {
        object: {
          object: type === "charge.refunded" ? "charge" : "refund",
          id: "re_fixture",
        },
      },
    };
    const stripe = {} as Stripe;
    const handler = mocks.createStripeWebhook.mock.calls[0][0];
    await handler(event, stripe);
    await handler(event, stripe);
    expect(onRefundEvent).toHaveBeenCalledTimes(2);
    expect(onRefundEvent).toHaveBeenLastCalledWith(event, stripe);
  },
);
