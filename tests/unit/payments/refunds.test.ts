import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  select: vi.fn(),
  audit: vi.fn(),
  reportError: vi.fn(),
  stripe: {
    charges: { retrieve: vi.fn() },
    refunds: { create: vi.fn(), retrieve: vi.fn(), list: vi.fn() },
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: { transaction: mocks.transaction, select: mocks.select },
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("@kenstack/lib/errorReporter", () => ({
  reportError: mocks.reportError,
}));
vi.mock("@kenstack/payments/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/payments/server")>()),
  loadStripeConfig: () => ({ stripe: mocks.stripe, livemode: false }),
}));

import { createRefunds } from "@kenstack/payments/refunds";
import type Stripe from "stripe";

let rows: Record<string, Record<string, unknown>[]>;
let inTransaction: boolean;
let providerRefund: Record<string, unknown>;
let charge: Record<string, unknown>;
const input = {
  orderId: 10001,
  transactionId: 1,
  requestId: "refundrequest01",
  userId: 7,
  reason: "Screening canceled by staff",
};

function isMatch(row: Record<string, unknown>, predicate: SQL) {
  const { sql, params } = new PgDialect().sqlToQuery(predicate);
  return [...sql.matchAll(/"\w+"\."(\w+)" = \$(\d+)/g)].every((match) => {
    return (
      row[
        match[1].replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        )
      ] === params[Number(match[2]) - 1]
    );
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  inTransaction = false;
  rows = {
    orders: [
      {
        id: 10001,
        requestId: "orderrequest001",
        userId: 8,
        status: "active",
        currency: "cad",
        paymentCount: 1,
      },
    ],
    transactions: [
      {
        id: 1,
        orderId: 10001,
        kind: "payment",
        totalCents: 22500,
        status: "succeeded",
        stripeChargeId: "ch_original",
        stripePaymentIntentId: "pi_original",
        method: "credit",
      },
    ],
    audit_logs: [],
  };
  charge = {
    id: "ch_original",
    amount: 22500,
    amount_captured: 22500,
    amount_refunded: 0,
    currency: "cad",
    livemode: false,
    status: "succeeded",
    disputed: false,
    payment_intent: "pi_original",
  };
  providerRefund = {
    id: "re_refund",
    object: "refund",
    charge: "ch_original",
    payment_intent: "pi_original",
    amount: 22500,
    currency: "cad",
    status: "succeeded",
    balance_transaction: null,
    failure_balance_transaction: null,
    metadata: {
      orderId: "10001",
      requestId: "orderrequest001",
      refundRequestId: input.requestId,
      refundTransactionId: "2",
      originalTransactionId: "1",
    },
  };
  mocks.select.mockImplementation(() => ({
    from: (table: Parameters<typeof getTableName>[0]) => {
      let predicate: SQL | undefined;
      const query = {
        where: (value: SQL) => {
          predicate = value;
          return query;
        },
        for: () => query,
        orderBy: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(
            rows[getTableName(table)].filter(
              (row) => !predicate || isMatch(row, predicate),
            ),
          ).then(resolve),
      };
      return query;
    },
  }));
  mocks.transaction.mockImplementation(async (run) => {
    inTransaction = true;
    const before = structuredClone(rows);
    try {
      return await run({
        select: mocks.select,
        insert: (table: Parameters<typeof getTableName>[0]) => ({
          values: (values: Record<string, unknown>) => ({
            returning: async () => {
              const row = {
                id: rows[getTableName(table)].length + 1,
                status: "pending",
                stripeRefundId: null,
                finishedAt: null,
                createdAt: new Date(),
                ...values,
              };
              rows[getTableName(table)].push(row);
              return [row];
            },
          }),
        }),
        update: (table: Parameters<typeof getTableName>[0]) => ({
          set: (values: Record<string, unknown>) => ({
            where: (predicate: SQL) => ({
              returning: async () => {
                const matching = rows[getTableName(table)].filter((row) =>
                  isMatch(row, predicate),
                );
                matching.forEach((row) => Object.assign(row, values));
                return matching;
              },
            }),
          }),
        }),
      });
    } catch (error) {
      rows = before;
      throw error;
    } finally {
      inTransaction = false;
    }
  });
  mocks.audit.mockImplementation(async (entry) => {
    if (entry.action === "refund.provider_error")
      expect(inTransaction).toBe(false);
    rows.audit_logs.push({
      action: entry.action,
      table: entry.table,
      rowId: entry.rowId,
      userId: entry.userId,
      data: entry.data,
    });
  });
  mocks.stripe.charges.retrieve.mockImplementation(async () => ({ ...charge }));
  mocks.stripe.refunds.list.mockReturnValue({
    autoPagingToArray: async () => [],
  });
  mocks.stripe.refunds.create.mockImplementation(async () => {
    if (mocks.stripe.refunds.create.mock.calls.length === 1)
      expect(inTransaction).toBe(false);
    expect(
      rows.audit_logs.some((row) => row.action === "refund.provider_started"),
    ).toBe(true);
    if (providerRefund.status === "succeeded") charge.amount_refunded = 22500;
    return providerRefund;
  });
  mocks.stripe.refunds.retrieve.mockImplementation(async () => providerRefund);
});

it("commits acceptance and staff reason before issuing a full refund, then releases under the order lock", async () => {
  const onRefunded = vi.fn(async () => {
    expect(inTransaction).toBe(true);
  });
  const result = await createRefunds({ onRefunded }).refundPayment(input);

  expect(result).toMatchObject({
    id: 2,
    orderId: 10001,
    status: "succeeded",
    totalCents: -22500,
  });
  expect(onRefunded).toHaveBeenCalledOnce();
  expect(rows.transactions[0].status).toBe("succeeded");
  expect(rows.audit_logs).toContainEqual(
    expect.objectContaining({
      action: "refund.requested",
      userId: 7,
      data: expect.objectContaining({
        reason: input.reason,
        requestId: input.requestId,
      }),
    }),
  );
  expect(mocks.stripe.refunds.create).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 22500, charge: "ch_original" }),
    { idempotencyKey: "order:orderrequest001:refund:2" },
  );
});

it.each(["pending", "requires_action", "failed", "canceled"])(
  "retains the reservation for a %s refund",
  async (status) => {
    providerRefund.status = status;
    const onRefunded = vi.fn();
    const result = await createRefunds({ onRefunded }).refundPayment(input);
    expect(result.status).toBe(status);
    expect(onRefunded).not.toHaveBeenCalled();
  },
);

it("keeps a timed-out request pending and never creates another refund from an empty listing", async () => {
  mocks.stripe.refunds.create.mockRejectedValue(
    new Error("Connection interrupted"),
  );
  const refunds = createRefunds({});
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "Stripe did not confirm",
  );
  rows.transactions[1].createdAt = new Date("2020-01-01");
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "needs staff review",
  );
  await expect(
    refunds.refundPayment({ ...input, requestId: "refundrequest02" }),
  ).rejects.toThrow("needs staff review");
  expect(rows.transactions[1].status).toBe("pending");
  expect(rows.audit_logs).toContainEqual(
    expect.objectContaining({
      action: "refund.review_required",
      rowId: 2,
      data: expect.objectContaining({ reason: "provider_unknown" }),
    }),
  );
  expect(mocks.reportError).toHaveBeenCalled();
  expect(mocks.stripe.refunds.create).toHaveBeenCalledOnce();
});

it("reports an external refund for a known payment without changing financial or fulfillment state", async () => {
  const onRefunded = vi.fn();
  const event = {
    id: "evt_external",
    type: "refund.updated",
    livemode: false,
    data: { object: { ...providerRefund, metadata: {} } },
  } as unknown as Stripe.Event;
  await createRefunds({ onRefunded }).reconcileRefundEvent(
    event,
    mocks.stripe as unknown as Stripe,
  );
  expect(rows.transactions).toHaveLength(1);
  expect(rows.transactions[0].status).toBe("succeeded");
  expect(rows.audit_logs).toContainEqual(
    expect.objectContaining({
      action: "refund.review_required",
      rowId: 1,
      data: expect.objectContaining({
        reason: "external_refund",
        stripeRefundId: "re_refund",
      }),
    }),
  );
  expect(mocks.reportError).toHaveBeenCalledOnce();
  expect(mocks.stripe.refunds.create).not.toHaveBeenCalled();
  expect(onRefunded).not.toHaveBeenCalled();
});

it("ignores external refunds for charges this application does not own", async () => {
  const event = {
    id: "evt_unowned",
    type: "refund.updated",
    livemode: false,
    data: {
      object: { ...providerRefund, metadata: {}, charge: "ch_elsewhere" },
    },
  } as unknown as Stripe.Event;
  await createRefunds({}).reconcileRefundEvent(
    event,
    mocks.stripe as unknown as Stripe,
  );
  expect(mocks.audit).not.toHaveBeenCalled();
  expect(mocks.reportError).not.toHaveBeenCalled();
});

it("recovers a crash before submission by replaying identical arguments and key within 23 hours", async () => {
  mocks.stripe.refunds.create.mockRejectedValueOnce(
    new Error("Process interrupted before submission"),
  );
  const refunds = createRefunds({});
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "Stripe did not confirm",
  );
  const result = await refunds.refundPayment({
    ...input,
    reason: "A changed retry description",
  });
  expect(result.status).toBe("succeeded");
  expect(mocks.stripe.refunds.create).toHaveBeenCalledTimes(2);
  expect(mocks.stripe.refunds.create.mock.calls[1]).toEqual(
    mocks.stripe.refunds.create.mock.calls[0],
  );
  expect(rows.transactions).toHaveLength(2);
  expect(rows.audit_logs).toContainEqual(
    expect.objectContaining({ action: "refund.provider_error" }),
  );
});

it("releases its transaction before auditing a failed same-key replay", async () => {
  mocks.stripe.refunds.create.mockRejectedValue(
    new Error("Stripe unavailable"),
  );
  const refunds = createRefunds({});
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "Stripe did not confirm",
  );
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "Stripe did not confirm",
  );
  expect(rows.transactions[1].status).toBe("pending");
  expect(
    rows.audit_logs.filter((row) => row.action === "refund.provider_error"),
  ).toHaveLength(2);
  expect(mocks.stripe.refunds.create.mock.calls[1]).toEqual(
    mocks.stripe.refunds.create.mock.calls[0],
  );
});

it("recovers a lost create response by refund metadata without issuing a second request", async () => {
  mocks.stripe.refunds.create.mockRejectedValue(
    new Error("Connection interrupted"),
  );
  const onRefunded = vi.fn();
  const refunds = createRefunds({ onRefunded });
  await expect(refunds.refundPayment(input)).rejects.toThrow();
  charge.amount_refunded = 22500;
  mocks.stripe.refunds.list.mockReturnValue({
    autoPagingToArray: async () => [providerRefund],
  });

  expect((await refunds.refundPayment(input)).status).toBe("succeeded");
  expect(mocks.stripe.refunds.create).toHaveBeenCalledOnce();
  expect(onRefunded).toHaveBeenCalledOnce();
});

it("does not reissue a failed refund when the same staff request is retried", async () => {
  providerRefund.status = "failed";
  const refunds = createRefunds({});
  await refunds.refundPayment(input);
  await refunds.refundPayment(input);
  expect(mocks.stripe.refunds.create).toHaveBeenCalledOnce();
});

it.each([
  { amount_refunded: 1 },
  { disputed: true },
  { livemode: true },
  { currency: "usd" },
  { amount_captured: 22499 },
  { payment_intent: "pi_elsewhere" },
])(
  "rejects changed charge evidence before requesting a refund: %j",
  async (change) => {
    Object.assign(charge, change);
    await expect(createRefunds({}).refundPayment(input)).rejects.toThrow(
      "review",
    );
    expect(mocks.stripe.refunds.create).not.toHaveBeenCalled();
  },
);

it("rejects externally pending refunds instead of issuing another full refund", async () => {
  mocks.stripe.refunds.list.mockReturnValue({
    autoPagingToArray: async () => [{ status: "pending" }],
  });
  await expect(createRefunds({}).refundPayment(input)).rejects.toThrow(
    "existing Stripe refund",
  );
  expect(mocks.stripe.refunds.create).not.toHaveBeenCalled();
});

it.each([
  { amount: 22499 },
  { currency: "usd" },
  { charge: "ch_other" },
  { payment_intent: "pi_other" },
  { metadata: { refundTransactionId: "2" } },
])(
  "rejects mismatched current refund evidence without releasing inventory: %j",
  async (change) => {
    Object.assign(providerRefund, change);
    const onRefunded = vi.fn();
    await expect(
      createRefunds({ onRefunded }).refundPayment(input),
    ).rejects.toThrow("evidence");
    expect(onRefunded).not.toHaveBeenCalled();
    expect(rows.transactions[1].status).toBe("pending");
  },
);

it("keeps failed-refund balance reversal evidence and reconciles net fees", async () => {
  Object.assign(providerRefund, {
    status: "failed",
    balance_transaction: {
      id: "txn_refund",
      source: "re_refund",
      currency: "cad",
      amount: -22500,
      fee: 7,
    },
    failure_balance_transaction: {
      id: "txn_returned",
      source: "re_refund",
      currency: "cad",
      amount: 22500,
      fee: -7,
    },
    failure_reason: "declined",
  });
  const onRefunded = vi.fn();
  await createRefunds({ onRefunded }).refundPayment(input);
  expect(rows.transactions[1]).toMatchObject({
    status: "failed",
    feeCents: 0,
    errorCode: "declined",
  });
  expect(rows.audit_logs).toContainEqual(
    expect.objectContaining({
      data: expect.objectContaining({
        failureBalanceTransactionId: "txn_returned",
      }),
    }),
  );
  expect(onRefunded).not.toHaveBeenCalled();
});

it("rejects refund balance evidence that does not match the refund", async () => {
  providerRefund.balance_transaction = {
    id: "txn_refund",
    source: "re_elsewhere",
    currency: "cad",
    amount: -22500,
    fee: 7,
  };
  const onRefunded = vi.fn();
  await expect(
    createRefunds({ onRefunded }).refundPayment(input),
  ).rejects.toThrow("balance evidence");
  expect(onRefunded).not.toHaveBeenCalled();
  expect(rows.transactions[1].status).toBe("pending");
});

it("reconciles the refunds listed for a charge.refunded event", async () => {
  providerRefund.status = "pending";
  const onRefunded = vi.fn();
  const refunds = createRefunds({ onRefunded });
  await refunds.refundPayment(input);
  providerRefund.status = "succeeded";
  charge.amount_refunded = 22500;
  mocks.stripe.refunds.list.mockReturnValue({
    autoPagingToArray: async () => [providerRefund],
  });
  const event = {
    id: "evt_charge",
    type: "charge.refunded",
    livemode: false,
    data: { object: { object: "charge", id: "ch_original" } },
  } as unknown as Stripe.Event;
  await refunds.reconcileRefundEvent(event, mocks.stripe as unknown as Stripe);
  expect(rows.transactions[1].status).toBe("succeeded");
  expect(onRefunded).toHaveBeenCalledOnce();
});

it("uses current provider state when an old successful webhook arrives after a failure", async () => {
  providerRefund.status = "pending";
  const onRefunded = vi.fn();
  const refunds = createRefunds({ onRefunded });
  await refunds.refundPayment(input);
  const event = {
    id: "evt_old",
    type: "refund.updated",
    livemode: false,
    data: { object: { ...providerRefund, status: "succeeded" } },
  } as unknown as Stripe.Event;
  providerRefund.status = "failed";
  await refunds.reconcileRefundEvent(event, mocks.stripe as unknown as Stripe);
  expect(rows.transactions[1].status).toBe("failed");
  expect(onRefunded).not.toHaveBeenCalled();
  expect(mocks.stripe.refunds.create).toHaveBeenCalledOnce();
});

it("replays successful webhooks without issuing another refund or changing the first terminal observation", async () => {
  const onRefunded = vi.fn();
  const refunds = createRefunds({ onRefunded });
  await refunds.refundPayment(input);
  const finishedAt = rows.transactions[1].finishedAt;
  const event = {
    id: "evt_repeat",
    type: "refund.updated",
    livemode: false,
    data: { object: providerRefund },
  } as unknown as Stripe.Event;
  await refunds.reconcileRefundEvent(event, mocks.stripe as unknown as Stripe);
  await refunds.reconcileRefundEvent(event, mocks.stripe as unknown as Stripe);
  expect(rows.transactions[1].finishedAt).toEqual(finishedAt);
  expect(mocks.stripe.refunds.create).toHaveBeenCalledOnce();
  // Fulfillment must be replay-safe: a prior webhook could have failed after financial reconciliation.
  expect(onRefunded).toHaveBeenCalledTimes(3);
});

it("requires a new staff request before retrying a confirmed failed refund", async () => {
  providerRefund.status = "failed";
  const refunds = createRefunds({});
  await refunds.refundPayment(input);
  const originalProvider = { ...providerRefund };
  providerRefund = {
    ...providerRefund,
    id: "re_retry",
    status: "succeeded",
    metadata: {
      orderId: "10001",
      requestId: "orderrequest001",
      refundRequestId: "refundrequest02",
      refundTransactionId: "3",
      originalTransactionId: "1",
    },
  };
  mocks.stripe.refunds.list.mockReturnValue({
    autoPagingToArray: async () => [originalProvider],
  });
  expect(
    (await refunds.refundPayment({ ...input, requestId: "refundrequest02" }))
      .status,
  ).toBe("succeeded");
  expect(mocks.stripe.refunds.create).toHaveBeenCalledTimes(2);
  expect(rows.transactions[1].status).toBe("failed");
  expect(rows.transactions[2].status).toBe("succeeded");
});
