import { getTableName } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  readPayment: vi.fn(),
  schedule: vi.fn(),
  stripe: {
    customers: { list: vi.fn(), create: vi.fn() },
    paymentIntents: {
      list: vi.fn(),
      create: vi.fn(),
      cancel: vi.fn(),
      confirm: vi.fn(),
    },
    products: { create: vi.fn() },
    subscriptions: { list: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({ db: { transaction: mocks.transaction } }));
vi.mock("@kenstack/logger", () => ({ audit: vi.fn() }));
vi.mock("@kenstack/payments/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/payments/server")>()),
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

it("can submit a different confirmation token after an uncertain pending confirmation", async () => {
  rows.transactions[0].stripePaymentIntentId = "pi_payment";
  mocks.readPayment.mockResolvedValue({
    status: "pending",
    intent: {
      id: "pi_payment",
      status: "requires_confirmation",
      livemode: false,
      currency: "usd",
      amount: 10001,
      metadata: {
        orderId: "10001",
        transactionId: "1",
        requestId: "abcdefghijklmn1",
      },
    },
    values: { status: "pending", stripePaymentIntentId: "pi_payment" },
  });
  const attempted = new Map<string, string>();
  mocks.stripe.paymentIntents.confirm.mockImplementation(
    async (_id, params, options) => {
      const previous = attempted.get(options.idempotencyKey);
      if (previous && previous !== params.confirmation_token)
        throw new Error("Idempotency parameters changed");
      attempted.set(options.idempotencyKey, params.confirmation_token);
      throw new Error("Provider unavailable");
    },
  );
  const payments = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
  });
  for (const confirmationTokenId of [
    "ctoken_first",
    "ctoken_first",
    "ctoken_second",
  ])
    await expect(
      payments.reconcileOrder(10001, {
        confirm: {
          confirmationTokenId,
          returnUrl: "https://example.com/complete",
        },
      }),
    ).rejects.toThrow("Provider unavailable");
  expect(attempted.size).toBe(2);
  expect([...attempted.keys()].every((key) => key.length <= 255)).toBe(true);
  expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
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
    metadata: { orderId: "10001", requestId: "abcdefghijklmn1" },
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
      metadata: {
        orderId: "10001",
        transactionId: "1",
        requestId: rows.orders[0].requestId,
      },
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
    { idempotencyKey: "member:7:abcdefghijklmn1" },
  );
  expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: 10001,
      currency: "usd",
      customer: "cus_member",
    }),
    { idempotencyKey: "order:abcdefghijklmn1:transaction:1:create" },
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
    { idempotencyKey: "order:abcdefghijklmn1:subscription" },
  );
  expect(mocks.stripe.products.create).toHaveBeenCalledWith(
    {
      name: "Course registration, Course materials",
      metadata: { orderId: "10001" },
    },
    { idempotencyKey: "order:abcdefghijklmn1:product:0" },
  );
  expect(mocks.schedule).toHaveBeenCalledWith(mocks.stripe, {
    subscriptionId: "sub_course",
    paymentCount: 3,
    idempotencyKey: "order:abcdefghijklmn1:schedule",
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

it.each([false, true])(
  "isolates Stripe operations by checkout while preserving retries (recurring=%s)",
  async (recurring) => {
    if (recurring) {
      rows.orders[0].paymentCount = 3;
      rows.transactions[0].instalment = 1;
      rows.transactions[0].totalCents = 3335;
      mocks.stripe.subscriptions.create.mockImplementation(async () => ({
        id: "sub_course",
        livemode: false,
        metadata: { orderId: "10001", requestId: rows.orders[0].requestId },
        latest_invoice: {
          id: "in_first",
          amount_due: 3335,
          currency: "usd",
          payments: {
            data: [
              {
                payment: {
                  type: "payment_intent",
                  payment_intent: "pi_payment",
                },
              },
            ],
          },
        },
      }));
    }
    const initialRows = structuredClone(rows);
    const { reconcileOrder } = createPayments({
      users,
      customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
    });
    for (const requestId of [
      "abcdefghijklmn1",
      "abcdefghijklmn2",
      "abcdefghijklmn1",
    ]) {
      rows = structuredClone(initialRows);
      rows.orders[0].requestId = requestId;
      await reconcileOrder(10001, {
        confirm: {
          confirmationTokenId: "ctoken_test",
          returnUrl: "https://example.test/paid",
        },
      });
    }
    for (const operation of [
      mocks.stripe.customers.create,
      ...(recurring
        ? [mocks.stripe.products.create, mocks.stripe.subscriptions.create]
        : [mocks.stripe.paymentIntents.create]),
    ]) {
      const keys = operation.mock.calls.map((call) => call[1].idempotencyKey);
      expect(keys).toHaveLength(3);
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[0]).toBe(keys[2]);
    }
    if (recurring) {
      const keys = mocks.schedule.mock.calls.map(
        (call) => call[1].idempotencyKey,
      );
      expect(keys[0]).not.toBe(keys[1]);
      expect(keys[0]).toBe(keys[2]);
    }
  },
);

it("ignores another checkout's PaymentIntent when recovering overlapping database IDs", async () => {
  mocks.stripe.paymentIntents.list.mockReturnValue([
    {
      id: "pi_other_checkout",
      metadata: {
        orderId: "10001",
        transactionId: "1",
        requestId: "othercheckout01",
      },
    },
  ]);
  await createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
  }).reconcileOrder(10001);
  expect(mocks.readPayment).not.toHaveBeenCalled();
  expect(rows.transactions[0].stripePaymentIntentId).toBeNull();
});

it.each(["canceled", "succeeded", "uncertain"])(
  "settles scarce resources only after resolving a declined intent (%s)",
  async (outcome) => {
    rows.transactions[0].stripePaymentIntentId = "pi_payment";
    rows.transactions[0].status = "failed";
    const failed = vi.fn();
    const settle = vi.fn();
    const buildEvidence = (status: string) => ({
      status,
      finishedAtVerified: true,
      intent: {
        id: "pi_payment",
        status: status === "failed" ? "requires_payment_method" : status,
        livemode: false,
        currency: "usd",
        amount: 10001,
        amount_received: status === "succeeded" ? 10001 : 0,
        metadata: {
          orderId: "10001",
          transactionId: "1",
          requestId: "abcdefghijklmn1",
        },
      },
      values: { status, finishedAt: new Date() },
    });
    mocks.readPayment.mockResolvedValueOnce(buildEvidence("failed"));
    if (outcome === "uncertain") {
      mocks.stripe.paymentIntents.cancel.mockRejectedValue(
        new Error("timeout"),
      );
      mocks.readPayment.mockResolvedValue(buildEvidence("processing"));
    } else {
      mocks.stripe.paymentIntents.cancel.mockResolvedValue({});
      mocks.readPayment.mockResolvedValue(buildEvidence(outcome));
    }
    const { reconcileOrder } = createPayments({
      users,
      customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
      prepareOrder: async () => ({ failed, settle }),
    });
    if (outcome === "uncertain") {
      await expect(reconcileOrder(10001)).rejects.toThrow("timeout");
      expect(failed).not.toHaveBeenCalled();
      expect(settle).not.toHaveBeenCalled();
    } else {
      await expect(reconcileOrder(10001)).resolves.toMatchObject({
        paymentStatus: outcome,
      });
      if (outcome === "canceled") {
        expect(failed).toHaveBeenCalledTimes(1);
        expect(settle).not.toHaveBeenCalled();
      } else {
        expect(settle).toHaveBeenCalledWith("succeeded");
        expect(failed).not.toHaveBeenCalled();
      }
    }
    expect(mocks.stripe.paymentIntents.cancel).toHaveBeenCalledWith(
      "pi_payment",
      {},
      { idempotencyKey: "order:abcdefghijklmn1:transaction:1:cancel" },
    );
  },
);

it("treats a cancel that throws as paid when the payment succeeded meanwhile", async () => {
  rows.transactions[0].stripePaymentIntentId = "pi_payment";
  rows.transactions[0].status = "failed";
  const failed = vi.fn();
  const settle = vi.fn();
  mocks.readPayment.mockResolvedValueOnce({
    status: "failed",
    intent: {
      status: "requires_payment_method",
      livemode: false,
      currency: "usd",
      amount: 10001,
      metadata: {
        orderId: "10001",
        transactionId: "1",
        requestId: "abcdefghijklmn1",
      },
    },
    values: { status: "failed", finishedAt: new Date() },
  });
  mocks.stripe.paymentIntents.cancel.mockRejectedValue(
    new Error("PaymentIntent has already succeeded"),
  );
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
    prepareOrder: async () => ({ failed, settle }),
  });
  await expect(reconcileOrder(10001)).resolves.toMatchObject({
    paymentStatus: "succeeded",
  });
  expect(rows.transactions[0].status).toBe("succeeded");
  expect(settle).toHaveBeenCalledWith("succeeded");
  expect(failed).not.toHaveBeenCalled();
});

it("cancels an expired order from an already canceled intent without another cancel attempt", async () => {
  rows.transactions[0].stripePaymentIntentId = "pi_payment";
  const settle = vi.fn();
  mocks.readPayment.mockResolvedValue({
    status: "canceled",
    finishedAtVerified: true,
    intent: {
      status: "canceled",
      livemode: false,
      currency: "usd",
      amount: 10001,
      metadata: {
        orderId: "10001",
        transactionId: "1",
        requestId: "abcdefghijklmn1",
      },
    },
    values: { status: "canceled", finishedAt: new Date() },
  });
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
    prepareOrder: async () => ({ settle }),
  });
  await expect(reconcileOrder(10001, { expire: true })).resolves.toMatchObject({
    paymentStatus: "canceled",
  });
  expect(mocks.stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  expect(rows.orders[0].status).toBe("canceled");
  expect(settle.mock.calls).toEqual([["canceled"]]);
});

it("preserves decline handling when the host has no resource-release callback", async () => {
  rows.transactions[0].stripePaymentIntentId = "pi_payment";
  const settle = vi.fn();
  mocks.readPayment.mockResolvedValue({
    status: "failed",
    intent: {
      status: "requires_payment_method",
      livemode: false,
      currency: "usd",
      amount: 10001,
      metadata: {
        orderId: "10001",
        transactionId: "1",
        requestId: "abcdefghijklmn1",
      },
    },
    values: { status: "failed", finishedAt: new Date() },
  });
  const { reconcileOrder } = createPayments({
    users,
    customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
    prepareOrder: async () => ({ settle }),
  });
  await expect(reconcileOrder(10001)).resolves.toMatchObject({
    paymentStatus: "failed",
  });
  expect(mocks.stripe.paymentIntents.cancel).not.toHaveBeenCalled();
  expect(settle).not.toHaveBeenCalled();
});

it.each([
  { status: "processing", expire: false },
  { status: "requires_action", expire: false },
  { status: "processing", expire: true },
])(
  "reopens an opted-in failed attempt without expiring provider processing: %j",
  async ({ status, expire }) => {
    rows.transactions[0].stripePaymentIntentId = "pi_payment";
    rows.transactions[0].status = "failed";
    rows.transactions[0].finishedAt = new Date();
    const failed = vi.fn();
    const settle = vi.fn();
    mocks.readPayment.mockResolvedValue({
      status,
      intent: {
        status,
        livemode: false,
        currency: "usd",
        amount: 10001,
        client_secret: "pi_payment_secret_test",
        metadata: {
          orderId: "10001",
          transactionId: "1",
          requestId: "abcdefghijklmn1",
        },
      },
      values: { status, finishedAt: null },
    });
    const { reconcileOrder } = createPayments({
      users,
      customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
      prepareOrder: async () => ({ failed, settle }),
    });
    await expect(reconcileOrder(10001, { expire })).resolves.toMatchObject({
      paymentStatus: status,
      transactionId: 1,
    });
    expect(rows.transactions[0]).toMatchObject({ status, finishedAt: null });
    expect(mocks.stripe.paymentIntents.cancel).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();
    expect(settle).not.toHaveBeenCalled();
  },
);
