import { getTableName } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  readPayment: vi.fn(),
  schedule: vi.fn(),
  stripe: {
    customers: { list: vi.fn(), create: vi.fn() },
    paymentIntents: { list: vi.fn(), create: vi.fn() },
    products: { create: vi.fn() },
    subscriptions: { list: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@kenstack/logger", () => ({ audit: vi.fn() }));
vi.mock("@kenstack/payments/server", () => ({
  loadStripeConfig: () => ({ stripe: mocks.stripe, livemode: false }),
  readPayment: mocks.readPayment,
  setInstallmentSchedule: mocks.schedule,
  createStripeWebhook: vi.fn(),
}));

import { defineTable } from "@kenstack/admin/table";
import { paymentUserColumns } from "@kenstack/payments/tables";
import { createPayments } from "@kenstack/payments/reconcile";

const users = defineTable({
  name: "payment_test_users",
  columns: paymentUserColumns,
});
let rows: Record<string, Record<string, unknown>[]>;
let inTransaction: boolean;

beforeEach(() => {
  vi.resetAllMocks();
  inTransaction = false;
  rows = {
    orders: [
      {
        id: 10001,
        requestId: "abcdefghijklmn1",
        userId: 7,
        status: "active",
        currency: "usd",
        paymentCount: 1,
        stripeSubscriptionId: null,
        stripeScheduleId: null,
        createdAt: new Date(),
        customerSnapshot: {
          email: "member@example.test",
          givenName: "Alex",
          familyName: "Example",
        },
      },
    ],
    order_items: [
      {
        id: 1,
        orderId: 10001,
        kind: "course",
        description: "Course registration",
        quantity: 1,
        unitCents: 10001,
        totalCents: 10001,
      },
    ],
    transactions: [
      {
        id: 1,
        orderId: 10001,
        kind: "payment",
        instalment: null,
        status: "pending",
        totalCents: 10001,
        stripePaymentIntentId: null,
        stripeInvoiceId: null,
        createdAt: new Date(),
      },
    ],
    payment_test_users: [{ id: 7, stripeCustomerId: null }],
  };
  mocks.transaction.mockImplementation(async (run) => {
    inTransaction = true;
    try {
      return await run({
        select: () => ({
          from: (table: Parameters<typeof getTableName>[0]) => {
            const query = {
              where: () => query,
              for: () => query,
              orderBy: () => query,
              limit: () => query,
              then: (resolve: (value: unknown) => unknown) =>
                Promise.resolve(rows[getTableName(table)] ?? []).then(resolve),
            };
            return query;
          },
        }),
        update: (table: Parameters<typeof getTableName>[0]) => ({
          set: (values: Record<string, unknown>) => ({
            where: () => {
              rows[getTableName(table)] = rows[getTableName(table)].map(
                (row) => ({ ...row, ...values }),
              );
              return { returning: async () => rows[getTableName(table)] };
            },
          }),
        }),
      });
    } finally {
      inTransaction = false;
    }
  });
  mocks.stripe.customers.list.mockReturnValue([]);
  mocks.stripe.customers.create.mockResolvedValue({ id: "cus_member" });
  mocks.stripe.paymentIntents.list.mockReturnValue([]);
  mocks.stripe.paymentIntents.create.mockResolvedValue({ id: "pi_payment" });
  mocks.stripe.subscriptions.list.mockReturnValue([]);
  mocks.stripe.products.create.mockResolvedValue({ id: "prod_course" });
  mocks.stripe.subscriptions.create.mockResolvedValue({
    id: "sub_course",
    livemode: false,
    metadata: { orderId: "10001" },
    latest_invoice: {
      id: "in_first",
      amount_due: 3335,
      currency: "usd",
      payments: {
        data: [
          { payment: { type: "payment_intent", payment_intent: "pi_payment" } },
        ],
      },
    },
  });
  mocks.schedule.mockResolvedValue({ id: "sched_course" });
  mocks.readPayment.mockImplementation(async () => ({
    status: "succeeded",
    finishedAtVerified: true,
    intent: {
      id: "pi_payment",
      status: "succeeded",
      livemode: false,
      currency: "usd",
      amount: rows.transactions[0].totalCents,
      amount_received: rows.transactions[0].totalCents,
      metadata: { orderId: "10001", transactionId: "1" },
    },
    values: {
      status: "succeeded",
      stripePaymentIntentId: "pi_payment",
      stripeChargeId: "ch_payment",
      finishedAt: new Date(),
    },
  }));
});

it("collects an arbitrary order with the host's customer identity and no fulfillment hook", async () => {
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
  });
  expect(
    await reconcileOrder(10001, {
      confirm: {
        confirmationTokenId: "ctoken_test",
        returnUrl: "https://example.test/paid",
      },
    }),
  ).toMatchObject({
    paymentStatus: "succeeded",
    amountCents: 10001,
    items: [{ kind: "course", description: "Course registration" }],
  });
  expect(mocks.stripe.customers.create).toHaveBeenCalledWith(
    {
      email: "member@example.test",
      name: "Alex Example",
      metadata: { memberId: "7" },
    },
    { idempotencyKey: "member:7" },
  );
  expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: 10001,
      currency: "usd",
      customer: "cus_member",
    }),
    { idempotencyKey: "transaction:1:create" },
  );
});

it("recovers a customer by the configured metadata key before creating another", async () => {
  mocks.stripe.customers.list.mockReturnValue([
    { id: "cus_existing", metadata: { memberId: "7" } },
  ]);
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
  });
  await reconcileOrder(10001, {
    confirm: {
      confirmationTokenId: "ctoken_test",
      returnUrl: "https://example.test/paid",
    },
  });
  expect(mocks.stripe.customers.create).not.toHaveBeenCalled();
  expect(rows.payment_test_users[0].stripeCustomerId).toBe("cus_existing");
});

it("uses a three-payment plan and settles before calling the post-commit hook", async () => {
  rows.orders[0].paymentCount = 3;
  rows.transactions[0].instalment = 1;
  rows.transactions[0].totalCents = 3335;
  rows.order_items[0].unitCents = 9000;
  rows.order_items[0].totalCents = 9000;
  rows.order_items.push({
    id: 2,
    orderId: 10001,
    kind: "materials",
    description: "Course materials",
    quantity: 1,
    unitCents: 1001,
    totalCents: 1001,
  });
  const steps: string[] = [];
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
    async prepareOrder() {
      expect(inTransaction).toBe(true);
      steps.push("prepare");
      return {
        async settle(status) {
          expect(inTransaction).toBe(true);
          steps.push(status);
        },
      };
    },
    onReconciled(id, stripe, livemode) {
      expect(inTransaction).toBe(false);
      expect([id, stripe, livemode]).toEqual([10001, mocks.stripe, false]);
      steps.push("after commit");
    },
  });
  await reconcileOrder(10001, {
    confirm: {
      confirmationTokenId: "ctoken_test",
      returnUrl: "https://example.test/paid",
    },
  });
  expect(mocks.stripe.subscriptions.create).toHaveBeenCalledWith(
    expect.objectContaining({
      items: [
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 3333 }),
        }),
      ],
      add_invoice_items: [
        expect.objectContaining({
          price_data: expect.objectContaining({ unit_amount: 2 }),
        }),
      ],
    }),
    { idempotencyKey: "order:10001:subscription" },
  );
  expect(mocks.stripe.products.create).toHaveBeenCalledWith(
    {
      name: "Course registration, Course materials",
      metadata: { orderId: "10001" },
    },
    { idempotencyKey: "order:10001:product:0" },
  );
  expect(mocks.schedule).toHaveBeenCalledWith(mocks.stripe, {
    subscriptionId: "sub_course",
    paymentCount: 3,
    idempotencyKey: "order:10001:schedule",
  });
  expect(steps).toEqual(["prepare", "succeeded", "after commit"]);
});

it.each([
  { expire: true, override: false, status: "pending", settled: [] },
  {
    expire: false,
    override: true,
    status: "canceled",
    settled: [["canceled"]],
  },
])(
  "honors the host expiry override $override over expire=$expire",
  async ({ expire, override, status, settled }) => {
    const settle = vi.fn();
    expect(
      (
        await createPayments({
          users,
          customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
          async prepareOrder() {
            return { expire: override, settle };
          },
        }).reconcileOrder(10001, { expire })
      ).paymentStatus,
    ).toBe(status);
    expect(rows.transactions[0].status).toBe(status);
    expect(settle.mock.calls).toEqual(settled);
    expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
  },
);

it("does not run the post-commit hook when fulfillment fails", async () => {
  rows.transactions[0].stripePaymentIntentId = "pi_payment";
  const onReconciled = vi.fn();
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
    async prepareOrder() {
      return {
        async settle() {
          throw new Error("Fulfillment failed");
        },
      };
    },
    onReconciled,
  });
  await expect(reconcileOrder(10001)).rejects.toThrow("Fulfillment failed");
  expect(onReconciled).not.toHaveBeenCalled();
});
