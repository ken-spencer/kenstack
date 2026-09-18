import { beforeEach, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  audit: vi.fn(),
  stripe: {
    customers: { retrieve: vi.fn(), update: vi.fn() },
    paymentMethods: {
      retrieve: vi.fn(),
      update: vi.fn(),
      detach: vi.fn(),
      list: vi.fn(),
    },
    subscriptions: { retrieve: vi.fn(), update: vi.fn(), list: vi.fn() },
    setupIntents: { create: vi.fn() },
    customerSessions: { create: vi.fn() },
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: { select: mocks.select, transaction: mocks.transaction },
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("@kenstack/payments/server", () => ({
  loadStripeConfig: () => ({
    stripe: mocks.stripe,
    livemode: false,
    publishableKey: "pk_test_fixture",
  }),
}));
import { defineTable } from "@kenstack/admin/table";
import { paymentUserColumns } from "@kenstack/payments/tables";
import { createPaymentMethods } from "@kenstack/payments/cards";
const users = defineTable({
  name: "card_test_users",
  columns: paymentUserColumns,
});
const payments = createPaymentMethods({
  users,
  customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
});
const user = {
  id: 7,
  email: "member@example.test",
  givenName: "Alex",
  familyName: "Example",
};
let order:
  | {
      id: number;
      requestId: string;
      stripeSubscriptionId: string;
      status: string;
    }
  | undefined;

beforeEach(() => {
  vi.resetAllMocks();
  order = {
    id: 4,
    requestId: "request-four",
    stripeSubscriptionId: "sub_member",
    status: "active",
  };
  mocks.select.mockImplementation(() => ({
    from: (table: Parameters<typeof getTableName>[0]) => {
      const query = {
        where: () => query,
        for: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(
            getTableName(table) === "card_test_users"
              ? [{ id: 7, stripeCustomerId: "cus_member" }]
              : order
                ? [order]
                : [],
          ).then(resolve),
      };
      return query;
    },
  }));
  mocks.transaction.mockImplementation((run) => run({ select: mocks.select }));
  mocks.stripe.customers.retrieve.mockResolvedValue({
    id: "cus_member",
    livemode: false,
    metadata: { memberId: "7" },
    invoice_settings: { default_payment_method: "pm_old" },
  });
  mocks.stripe.paymentMethods.retrieve.mockResolvedValue({
    id: "pm_card",
    type: "card",
    customer: "cus_member",
    livemode: false,
  });
  mocks.stripe.subscriptions.retrieve.mockResolvedValue({
    id: "sub_member",
    customer: "cus_member",
    livemode: false,
    metadata: { orderId: "4", requestId: "request-four" },
    status: "active",
  });
  mocks.stripe.subscriptions.list.mockReturnValue([]);
});

it("rejects a card belonging to a different customer before mutation", async () => {
  mocks.stripe.paymentMethods.retrieve.mockResolvedValue({
    id: "pm_card",
    type: "card",
    customer: "cus_other",
    livemode: false,
  });
  await expect(
    payments.changePaymentMethod(user, {
      operation: "default",
      paymentMethodId: "pm_card",
    }),
  ).rejects.toThrow("Card not found");
  expect(mocks.stripe.customers.update).not.toHaveBeenCalled();
  expect(mocks.stripe.paymentMethods.update).not.toHaveBeenCalled();
});

it("updates the selected subscription without changing the customer's default", async () => {
  await payments.changePaymentMethod(user, {
    operation: "subscription",
    orderId: 4,
    paymentMethodId: "pm_card",
  });
  expect(mocks.stripe.subscriptions.update).toHaveBeenCalledWith("sub_member", {
    default_payment_method: "pm_card",
  });
  expect(mocks.stripe.customers.update).not.toHaveBeenCalled();
});

it("rejects a subscription whose checkout identity does not match", async () => {
  mocks.stripe.subscriptions.retrieve.mockResolvedValue({
    id: "sub_member",
    customer: "cus_member",
    livemode: false,
    metadata: { orderId: "4", requestId: "other-request" },
    status: "active",
  });
  await expect(
    payments.changePaymentMethod(user, {
      operation: "subscription",
      orderId: 4,
      paymentMethodId: "pm_card",
    }),
  ).rejects.toThrow("does not match");
  expect(mocks.stripe.subscriptions.update).not.toHaveBeenCalled();
});

it("does not accept an order outside the account", async () => {
  order = undefined;
  await expect(
    payments.changePaymentMethod(user, {
      operation: "subscription",
      orderId: 99,
      paymentMethodId: "pm_card",
    }),
  ).rejects.toThrow("not found");
  expect(mocks.stripe.subscriptions.retrieve).not.toHaveBeenCalled();
});

it.each(["pm_card", null])(
  "protects a card used by an active plan, including the customer fallback: %s",
  async (defaultMethod) => {
    mocks.stripe.customers.retrieve.mockResolvedValue({
      id: "cus_member",
      livemode: false,
      metadata: { memberId: "7" },
      invoice_settings: { default_payment_method: "pm_card" },
    });
    mocks.stripe.subscriptions.list.mockReturnValue([
      { status: "past_due", default_payment_method: defaultMethod },
    ]);
    await expect(
      payments.changePaymentMethod(user, {
        operation: "remove",
        paymentMethodId: "pm_card",
      }),
    ).rejects.toThrow("Choose another card");
    expect(mocks.stripe.paymentMethods.detach).not.toHaveBeenCalled();
  },
);

it("allows removing a card used only by an ended plan", async () => {
  mocks.stripe.subscriptions.list.mockReturnValue([
    { status: "canceled", default_payment_method: "pm_card" },
  ]);
  await payments.changePaymentMethod(user, {
    operation: "remove",
    paymentMethodId: "pm_card",
  });
  expect(mocks.stripe.paymentMethods.detach).toHaveBeenCalledWith("pm_card");
});

it("creates an authenticated customer setup for cards without charging", async () => {
  mocks.stripe.setupIntents.create.mockResolvedValue({
    client_secret: "fixture",
  });
  expect(await payments.createCardSetup(user)).toEqual({
    clientSecret: "fixture",
  });
  expect(mocks.stripe.setupIntents.create).toHaveBeenCalledWith(
    expect.objectContaining({
      customer: "cus_member",
      usage: "off_session",
      payment_method_types: ["card"],
    }),
  );
});
