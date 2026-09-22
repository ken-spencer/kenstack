import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  database: undefined as unknown as Record<PropertyKey, unknown>,
  stripe: {
    charges: { retrieve: vi.fn() },
    refunds: { create: vi.fn(), retrieve: vi.fn(), list: vi.fn() },
    balanceTransactions: { retrieve: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: new Proxy({}, { get: (_target, property) => mocks.database[property] }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: async () => null,
}));
vi.mock("@kenstack/lib/ip", () => ({ default: async () => null }));
vi.mock("@vercel/functions", () => ({ geolocation: () => ({}) }));
vi.mock("@kenstack/payments/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/payments/server")>()),
  loadStripeConfig: () => ({ stripe: mocks.stripe, livemode: false }),
}));

import { auditLogs } from "@kenstack/db/tables/audit";
import { createRefunds } from "@kenstack/payments/refunds";
import { transactions } from "@kenstack/payments/tables";
import { startTestPostgres } from "../postgres";

let cluster: Awaited<ReturnType<typeof startTestPostgres>>;
let database: PostgresJsDatabase;
let sqlClient: ReturnType<typeof postgres>;
let observer: ReturnType<typeof postgres>;
let providerRefunds: Stripe.Refund[];
let chargeRefundedCents: number;
const input = {
  orderId: 10001,
  transactionId: 1,
  requestId: "refundrequest01",
  userId: 7,
  reason: "Staff cancellation",
};

beforeAll(async () => {
  cluster = await startTestPostgres();
  sqlClient = postgres({
    ...cluster.connection,
    max: 2,
    prepare: false,
    connection: { application_name: "refund-app", statement_timeout: 5000 },
  });
  observer = postgres({
    ...cluster.connection,
    max: 1,
    prepare: false,
    connection: { application_name: "refund-observer" },
  });
  database = drizzle(sqlClient);
  mocks.database = database as unknown as Record<PropertyKey, unknown>;

  // This disposable fixture exposes the current shared ledger columns without a host migration dependency.
  await sqlClient.unsafe(`
    create table orders (
      id integer generated always as identity (start with 10001) primary key,
      request_id varchar(15) not null unique,
      user_id integer,
      channel text not null,
      currency varchar(3) not null,
      customer_snapshot jsonb not null,
      status text not null default 'active',
      payment_count integer,
      monthly_cents integer,
      cover_fees boolean not null default false,
      stripe_subscription_id text unique,
      stripe_schedule_id text unique,
      created_at timestamptz not null default now()
    );
    create table transactions (
      id integer generated always as identity primary key,
      order_id integer not null references orders(id) on delete restrict,
      kind text not null,
      original_transaction_id integer,
      instalment integer,
      total_cents integer not null,
      fee_cents integer,
      tendered_cents integer,
      rounding_cents integer,
      method text,
      points integer,
      status text not null default 'pending',
      error_code text,
      stripe_invoice_id text,
      stripe_payment_intent_id text,
      stripe_charge_id text unique,
      stripe_refund_id text unique,
      stripe_dispute_id text,
      stripe_balance_transaction_id text unique,
      created_at timestamptz not null default now(),
      finished_at timestamptz,
      unique (id, order_id),
      foreign key (original_transaction_id, order_id) references transactions(id, order_id),
      check ((kind = 'payment' and original_transaction_id is null)
        or (kind <> 'payment' and original_transaction_id is not null and original_transaction_id <> id)),
      check ((kind in ('payment', 'dispute_reversal') and total_cents > 0)
        or (kind in ('refund', 'dispute') and total_cents < 0)),
      check (status <> 'succeeded' or method is not null),
      check ((status in ('succeeded', 'failed', 'canceled')) = (finished_at is not null)),
      check (stripe_refund_id is null or kind = 'refund'),
      check (kind = 'payment' or (stripe_invoice_id is null and stripe_payment_intent_id is null and stripe_charge_id is null))
    );
    create table audit_logs (
      id integer generated always as identity primary key,
      created_at timestamptz not null default now(),
      org_id integer,
      user_id integer,
      impersonated_by integer,
      action varchar(64) not null,
      "table" varchar(64),
      row_id integer,
      pathname text,
      ip_address inet,
      user_agent text,
      geo jsonb,
      data jsonb
    );
  `);
});

beforeEach(async () => {
  vi.resetAllMocks();
  providerRefunds = [];
  chargeRefundedCents = 0;
  await sqlClient.unsafe(`
    truncate audit_logs, transactions, orders restart identity;
    insert into orders (request_id, user_id, channel, currency, customer_snapshot, payment_count)
      values ('orderrequest001', 8, 'website', 'cad', '{}', 1);
    insert into transactions (order_id, kind, total_cents, method, status, stripe_charge_id, stripe_payment_intent_id, finished_at)
      values (10001, 'payment', 22500, 'credit', 'succeeded', 'ch_original', 'pi_original', now());
  `);
  mocks.stripe.charges.retrieve.mockImplementation(async () => ({
    id: "ch_original",
    amount: 22500,
    amount_captured: 22500,
    amount_refunded: chargeRefundedCents,
    currency: "cad",
    livemode: false,
    status: "succeeded",
    disputed: false,
    payment_intent: "pi_original",
  }));
  mocks.stripe.refunds.list.mockImplementation(() => ({
    autoPagingToArray: async () => providerRefunds,
  }));
  mocks.stripe.refunds.retrieve.mockImplementation(async (id: string) => {
    const refund = providerRefunds.find((item) => item.id === id);
    if (!refund) throw new Error("Unknown provider refund fixture");
    return refund;
  });
  const byKey = new Map<string, Stripe.Refund>();
  mocks.stripe.refunds.create.mockImplementation(
    async (
      params: Stripe.RefundCreateParams,
      options: Stripe.RequestOptions,
    ) => {
      if (!options.idempotencyKey) throw new Error("Missing idempotency key");
      if (
        params.amount === undefined ||
        !params.charge ||
        !params.metadata ||
        typeof params.metadata !== "object"
      ) {
        throw new Error("Missing refund amount, charge or identity metadata");
      }
      const prior = byKey.get(options.idempotencyKey);
      if (prior) return prior;
      const refund = {
        id: `re_${providerRefunds.length + 1}`,
        object: "refund",
        amount: params.amount,
        charge: params.charge,
        payment_intent: "pi_original",
        currency: "cad",
        status: "succeeded",
        balance_transaction: null,
        metadata: Object.fromEntries(
          Object.entries(params.metadata).map(([key, value]) => [
            key,
            String(value),
          ]),
        ),
        created: Math.floor(Date.now() / 1000),
        customer: null,
        customer_account: null,
        payment_method: null,
        reason: null,
        receipt_number: null,
        source_transfer_reversal: null,
        transfer_reversal: null,
      } satisfies Stripe.Refund;
      byKey.set(options.idempotencyKey, refund);
      providerRefunds.push(refund);
      chargeRefundedCents += refund.amount;
      return refund;
    },
  );
});

afterAll(async () => {
  try {
    await Promise.all([
      sqlClient?.end({ timeout: 5 }),
      observer?.end({ timeout: 5 }),
    ]);
  } finally {
    await cluster?.stop();
  }
});

it("serializes simultaneous staff requests into one durable refund and one provider effect", async () => {
  const reachedCharge = Promise.withResolvers<void>();
  const releaseCharge = Promise.withResolvers<void>();
  mocks.stripe.charges.retrieve.mockImplementationOnce(async () => {
    reachedCharge.resolve();
    await releaseCharge.promise;
    return {
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
  });
  const refunds = createRefunds({});
  const results = Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      refunds.refundPayment({ ...input, requestId: `refundrequest0${index}` }),
    ),
  );
  try {
    await reachedCharge.promise;
    await expect
      .poll(async () => {
        const [{ count }] =
          await observer`select count(*)::int as count from pg_stat_activity where application_name = 'refund-app' and wait_event_type = 'Lock'`;
        return count;
      })
      .toBeGreaterThan(0);
  } finally {
    releaseCharge.resolve();
  }
  const returned = await results;
  expect(new Set(returned.map((result) => result.id)).size).toBe(1);
  const saved = await database
    .select()
    .from(transactions)
    .where(eq(transactions.kind, "refund"));
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    originalTransactionId: 1,
    status: "succeeded",
    totalCents: -22500,
  });
  expect(providerRefunds).toHaveLength(1);
  expect(chargeRefundedCents).toBe(22500);
  const requests = await database
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, "refund.requested"));
  expect(requests).toHaveLength(1);
});

it("persists an unknown provider outcome as pending and never submits money during status reconciliation", async () => {
  mocks.stripe.refunds.create.mockRejectedValue(
    new Error("Connection interrupted"),
  );
  const onRefunded = vi.fn();
  const refunds = createRefunds({ onRefunded });
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "Stripe did not confirm",
  );
  const [saved] = await database
    .select()
    .from(transactions)
    .where(eq(transactions.kind, "refund"));
  expect(saved).toMatchObject({
    status: "pending",
    stripeRefundId: null,
    finishedAt: null,
  });
  expect((await refunds.reconcileRefund(saved.id)).status).toBe("pending");
  expect(mocks.stripe.refunds.create).toHaveBeenCalledOnce();
  expect(onRefunded).not.toHaveBeenCalled();
  const audit = await database
    .select({ action: auditLogs.action })
    .from(auditLogs);
  expect(audit.map((row) => row.action)).toEqual(
    expect.arrayContaining([
      "refund.requested",
      "refund.provider_started",
      "refund.provider_error",
    ]),
  );
});

it("audits a failed retry after releasing its transaction while another request waits with a two-connection pool", async () => {
  mocks.stripe.refunds.create.mockRejectedValueOnce(
    new Error("First response lost"),
  );
  const refunds = createRefunds({});
  await expect(refunds.refundPayment(input)).rejects.toThrow(
    "Stripe did not confirm",
  );
  const reachedProvider = Promise.withResolvers<void>();
  const releaseProvider = Promise.withResolvers<void>();
  mocks.stripe.refunds.create.mockImplementationOnce(async () => {
    reachedProvider.resolve();
    await releaseProvider.promise;
    throw new Error("Replay response lost");
  });
  const retry = refunds.refundPayment(input).then(
    () => {
      throw new Error("Expected provider uncertainty");
    },
    (error: unknown) => error,
  );
  await reachedProvider.promise;
  const contender = refunds.refundPayment({
    ...input,
    requestId: "refundrequest02",
  });
  try {
    await expect
      .poll(async () => {
        const [{ count }] =
          await observer`select count(*)::int as count from pg_stat_activity where application_name = 'refund-app' and wait_event_type = 'Lock'`;
        return count;
      })
      .toBeGreaterThan(0);
  } finally {
    releaseProvider.resolve();
  }
  const [failure, result] = await Promise.all([retry, contender]);
  expect(failure).toMatchObject({
    message: expect.stringContaining("Stripe did not confirm"),
  });
  expect(result.status).toBe("pending");
  expect(mocks.stripe.refunds.create.mock.calls[1]).toEqual(
    mocks.stripe.refunds.create.mock.calls[0],
  );
  const errors = await database
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, "refund.provider_error"));
  expect(errors).toHaveLength(2);
  expect(
    await database
      .select()
      .from(transactions)
      .where(eq(transactions.kind, "refund")),
  ).toHaveLength(1);
});
