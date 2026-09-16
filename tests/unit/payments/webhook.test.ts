import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  reconcile: vi.fn(),
  select: vi.fn(),
  handler: vi.fn(),
  transaction: vi.fn(),
  readPayment: vi.fn(),
  audit: vi.fn(),
  update: vi.fn(),
  onReconciled: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("@kenstack/payments/server", () => ({
  readPayment: mocks.readPayment,
  createStripeWebhook: (handler: (...args: unknown[]) => unknown) => {
    mocks.handler.mockImplementation(handler);
    return vi.fn();
  },
}));
vi.mock("@app/db", () => ({
  db: {
    insert: mocks.insert,
    select: mocks.select,
    transaction: mocks.transaction,
    update: mocks.update,
  },
}));
import { createPaymentWebhook } from "@kenstack/payments/webhook";

createPaymentWebhook(mocks.reconcile, mocks.onReconciled);

const event = {
  id: "evt_payment",
  created: 1800000000,
  type: "payment_intent.succeeded",
  data: {
    object: { id: "pi_payment", metadata: { requestId: "abcdefghijklmn1" } },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.insert.mockReturnValue({
    values: () => ({ onConflictDoNothing: async () => [] }),
  });
  mocks.select.mockReturnValue({
    from: () => ({
      leftJoin: () => ({
        where: () => ({ limit: async () => [{ id: 10001 }] }),
      }),
    }),
  });
});

describe("payment webhook recovery", () => {
  it.each([
    { metadata: {}, identifiers: ["pi_payment"] },
    { metadata: { requestId: "" }, identifiers: ["pi_payment"] },
    {
      metadata: { requestId: "abcdefghijklmn1" },
      identifiers: ["pi_payment", "abcdefghijklmn1"],
    },
  ])(
    "looks up an intent only by supplied identifiers: $metadata",
    async ({ metadata, identifiers }) => {
      const where = vi.fn((condition: SQL) => {
        expect(new PgDialect().sqlToQuery(condition).params).toEqual(
          identifiers,
        );
        return { limit: async () => [] };
      });
      mocks.select.mockReturnValue({
        from: () => ({ leftJoin: () => ({ where }) }),
      });
      await mocks.handler(
        { ...event, data: { object: { id: "pi_payment", metadata } } },
        {
          invoicePayments: {
            list: () => ({ autoPagingToArray: async () => [] }),
          },
        },
      );
      expect(where).toHaveBeenCalledTimes(1);
      expect(mocks.reconcile).not.toHaveBeenCalled();
    },
  );

  it.each([
    { metadata: {}, identifiers: ["sub_test"] },
    { metadata: { requestId: "" }, identifiers: ["sub_test"] },
    {
      metadata: { requestId: "abcdefghijklmn1" },
      identifiers: ["sub_test", "abcdefghijklmn1"],
    },
  ])(
    "looks up an invoice only by supplied identifiers: $metadata",
    async ({ metadata, identifiers }) => {
      const where = vi.fn(async (condition: SQL) => {
        expect(new PgDialect().sqlToQuery(condition).params).toEqual(
          identifiers,
        );
        return [];
      });
      mocks.select.mockReturnValue({ from: () => ({ where }) });
      await mocks.handler(
        { ...event, type: "invoice.paid", data: { object: { id: "in_test" } } },
        {
          invoices: {
            retrieve: async () => ({
              parent: { subscription_details: { subscription: "sub_test" } },
            }),
          },
          subscriptions: { retrieve: async () => ({ metadata }) },
        },
      );
      expect(where).toHaveBeenCalledTimes(1);
      expect(mocks.reconcile).not.toHaveBeenCalled();
    },
  );

  it("runs reconciliation again for a duplicate logged event", async () => {
    await mocks.handler(event, {
      invoicePayments: { list: () => ({ autoPagingToArray: async () => [] }) },
    });
    await mocks.handler(event, {
      invoicePayments: { list: () => ({ autoPagingToArray: async () => [] }) },
    });
    expect(mocks.reconcile).toHaveBeenCalledTimes(2);
    expect(mocks.reconcile).toHaveBeenCalledWith(10001, { event });
  });
  it("propagates a financial failure so signature handling returns a retryable response", async () => {
    mocks.reconcile.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(
      mocks.handler(event, {
        invoicePayments: {
          list: () => ({ autoPagingToArray: async () => [] }),
        },
      }),
    ).rejects.toThrow("Database unavailable");
    expect(mocks.onReconciled).not.toHaveBeenCalled();
  });
});

describe("recurring collection lifecycle", () => {
  it("records an unpaid finalized invoice and deduplicates a chargeless failure", async () => {
    const collections: Record<string, unknown>[] = [];
    const rows: Record<string, Record<string, unknown>[]> = {
      orders: [
        {
          id: 10001,
          userId: 7,
          currency: "cad",
          stripeSubscriptionId: "sub_test",
        },
      ],
      transactions: collections,
    };
    const tx = {
      select: () => ({
        from: (table: Parameters<typeof getTableName>[0]) => {
          const query = {
            where: () => query,
            for: () => query,
            orderBy: () => query,
            limit: () => query,
            then: (resolve: (value: unknown) => unknown) =>
              Promise.resolve(rows[getTableName(table)]).then(resolve),
          };
          return query;
        },
      }),
      insert: () => ({
        values: (value: Record<string, unknown>) => {
          const recorded = {
            id: collections.length + 1,
            status: "pending",
            ...value,
          };
          collections.push(recorded);
          return {
            returning: async () => [recorded],
            then: (resolve: (value: unknown) => unknown) =>
              Promise.resolve().then(resolve),
          };
        },
      }),
      update: () => ({
        set: (value: Record<string, unknown>) => ({
          where: () => {
            Object.assign(collections[0], value);
            return { returning: async () => [collections[0]] };
          },
        }),
      }),
    };
    mocks.select.mockReturnValue({
      from: () => ({ where: async () => [{ id: 10001 }] }),
    });
    mocks.transaction.mockImplementation((run) => run(tx));
    const invoice = {
      id: "in_test",
      billing_reason: "subscription_cycle",
      parent: { subscription_details: { subscription: "sub_test" } },
      currency: "cad",
      amount_due: 2500,
      period_end: 2000,
      attempt_count: 1,
    };
    const payments: unknown[] = [];
    const stripe = {
      invoices: {
        retrieve: async () => invoice,
        list: () => ({
          autoPagingToArray: async () => [
            { billing_reason: "subscription_create", period_end: 1000 },
            invoice,
          ],
        }),
      },
      subscriptions: {
        retrieve: async () => ({ metadata: {}, livemode: false }),
      },
      invoicePayments: {
        list: () => ({ autoPagingToArray: async () => payments }),
      },
    };
    const invoiceEvent = {
      ...event,
      livemode: false,
      type: "invoice.finalized",
      data: { object: { id: invoice.id } },
    };
    await mocks.handler(invoiceEvent, stripe);
    expect(collections).toEqual([
      expect.objectContaining({
        instalment: 2,
        totalCents: 2500,
        status: "pending",
        stripeInvoiceId: "in_test",
      }),
    ]);
    payments.push({
      invoice: "in_test",
      payment: { type: "payment_intent", payment_intent: "pi_cycle" },
    });
    mocks.readPayment.mockResolvedValue({
      intent: { livemode: false, currency: "cad", amount: 2500 },
      status: "failed",
      values: {
        status: "failed",
        stripePaymentIntentId: "pi_cycle",
        stripeChargeId: null,
        finishedAt: new Date(2000),
      },
    });
    await mocks.handler(
      { ...invoiceEvent, type: "invoice.payment_failed" },
      stripe,
    );
    invoice.attempt_count = 4;
    await mocks.handler(
      { ...invoiceEvent, type: "invoice.payment_failed" },
      stripe,
    );
    const renewalEvent = {
      ...event,
      type: "payment_intent.payment_failed",
      livemode: false,
      data: { object: { id: "pi_cycle", metadata: {} } },
    };
    await mocks.handler(renewalEvent, stripe);
    expect(mocks.readPayment).toHaveBeenLastCalledWith(
      stripe,
      "pi_cycle",
      renewalEvent,
    );
    expect(mocks.reconcile).not.toHaveBeenCalled();
    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({ status: "failed", instalment: 2 });
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.onReconciled).toHaveBeenLastCalledWith(10001, stripe, false);
  });
  it("retains a completed finite order when Stripe ends its subscription", async () => {
    mocks.select.mockReturnValue({
      from: () => ({
        where: async () => [{ id: 10001, stripeScheduleId: "sched_test" }],
      }),
    });
    await mocks.handler(
      {
        ...event,
        type: "customer.subscription.deleted",
        data: { object: { id: "sub_test" } },
      },
      {
        subscriptions: {
          retrieve: async () => ({
            id: "sub_test",
            status: "canceled",
            schedule: null,
          }),
        },
        subscriptionSchedules: {
          retrieve: async () => ({ status: "completed" }),
        },
      },
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
