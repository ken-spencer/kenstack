import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";
import postgres from "postgres";
import type Stripe from "stripe";

const mocks = vi.hoisted(() => ({
  database: undefined as unknown as Record<PropertyKey, unknown>,
  nextStatus: "succeeded" as "succeeded" | "failed",
  intents: new Map<
    string,
    {
      id: string;
      amount: number;
      currency: string;
      metadata: Record<string, string>;
      status: string;
    }
  >(),
  stripe: {
    customers: { retrieve: vi.fn() },
    customerSessions: { create: vi.fn() },
    paymentIntents: {
      list: vi.fn(),
      create: vi.fn(),
      confirm: vi.fn(),
      cancel: vi.fn(),
    },
  },
  reportError: vi.fn(),
}));
const patron = {
  id: 7,
  email: "patron@example.test",
  givenName: "Patron",
  familyName: "Example",
};

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: new Proxy({}, { get: (_target, key) => mocks.database[key] }),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@vercel/functions", () => ({
  geolocation: () => ({}),
  waitUntil: () => undefined,
}));
vi.mock("@kenstack/lib/ip", () => ({ default: async () => null }));
vi.mock("@kenstack/auth/server/auth", () => ({
  hasAccess: async () => true,
  isAuthenticated: async () => true,
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: async () => null,
  getFreshCurrentUser: async () => patron,
  requireUser: async () => patron,
}));
vi.mock("@kenstack/api/quota", () => ({ claimQuota: async () => null }));
vi.mock("@kenstack/lib/errorReporter", () => ({
  reportError: mocks.reportError,
}));
vi.mock("@kenstack/payments/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/payments/server")>()),
  loadStripeConfig: () => ({
    stripe: mocks.stripe,
    livemode: false,
    publishableKey: "pk_test_fixture",
  }),
  readPayment: async (_stripe: unknown, id: string) => {
    const intent = mocks.intents.get(id)!;
    return {
      status: intent.status,
      finishedAtVerified: true,
      intent: {
        ...intent,
        status:
          intent.status === "failed"
            ? "requires_payment_method"
            : intent.status,
        livemode: false,
        amount_received: intent.status === "succeeded" ? intent.amount : 0,
      },
      values: {
        status: intent.status,
        stripePaymentIntentId: id,
        stripeChargeId: intent.status === "succeeded" ? `ch_${id}` : null,
        method: "credit",
        finishedAt: ["succeeded", "failed", "canceled"].includes(intent.status)
          ? new Date()
          : null,
      },
    };
  },
}));

import * as z from "zod";
import { addressColumns, defineTable } from "@kenstack/admin/table";
import pipeline from "@kenstack/api/pipeline";
import { ReturnedError } from "@kenstack/api/errors";
import { userColumns } from "@kenstack/modules/users/tables";
import { createCheckout } from "@kenstack/payments/checkout/server";
import { createPayments } from "@kenstack/payments/reconcile";
import { paymentUserColumns } from "@kenstack/payments/tables";
import { startTestPostgres } from "../postgres";

const users = defineTable({
  name: "checkout_test_users",
  columns: { ...userColumns, ...addressColumns, ...paymentUserColumns },
});
// The scarce resource a site reserves: one row per held order item.
const testHolds = pgTable("test_holds", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderItemId: integer("order_item_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

const payments = createPayments({
  users,
  customer: { metadataKey: "memberId", idempotencyPrefix: "member" },
  // Reconciliation locks the order, then these domain rows, as a host's hook does.
  async prepareOrder({ tx, items }) {
    const held = inArray(
      testHolds.orderItemId,
      items.map((item) => item.id),
    );
    await tx
      .select({ id: testHolds.id })
      .from(testHolds)
      .where(held)
      .for("update");
    return {
      async settle(status) {
        if (status === "canceled") await tx.delete(testHolds).where(held);
      },
    };
  },
});

let holdGate: { reached: () => void; release: Promise<void> } | undefined;
let holdError: Error | undefined;
const checkout = createCheckout({ payments, users, currency: "cad" })({
  name: "screening",
  schema: z.object({ guests: z.number().int().positive() }),
  lines: async () => ({
    lines: [
      {
        kind: "private_screening",
        description: "Civic private screening",
        quantity: 1,
        unitCents: 22_500,
        taxCategory: "privateScreening",
      },
    ],
    schedule: { type: "once" as const },
    tax: { countryCode: "CA", regionCode: "BC", included: true },
  }),
  reservation: {
    async hold({ tx, items }) {
      const expiresAt = new Date(Date.now() + 600_000);
      await tx
        .insert(testHolds)
        .values({ orderItemId: items[0].id, expiresAt });
      if (holdGate) {
        holdGate.reached();
        await holdGate.release;
      }
      if (holdError) throw holdError;
      return { expiresAt };
    },
    async extend({ tx, items }) {
      const renewed = await tx
        .update(testHolds)
        .set({ expiresAt: new Date(Date.now() + 600_000) })
        .where(
          inArray(
            testHolds.orderItemId,
            items.map((item) => item.id),
          ),
        )
        .returning({ id: testHolds.id });
      if (!renewed.length)
        throw new ReturnedError("This reservation has ended.", {
          status: 409,
          code: "hold_ended",
        });
    },
  },
  returnPath: "/checkout/complete",
});

let cluster: Awaited<ReturnType<typeof startTestPostgres>>;
let sqlClient: ReturnType<typeof postgres>;
let observer: ReturnType<typeof postgres>;

beforeAll(async () => {
  cluster = await startTestPostgres();
  sqlClient = postgres({
    ...cluster.connection,
    max: 4,
    prepare: false,
    connection: { application_name: "checkout-app", statement_timeout: 5000 },
  });
  observer = postgres({
    ...cluster.connection,
    max: 1,
    prepare: false,
    connection: { application_name: "checkout-observer" },
  });
  mocks.database = drizzle(sqlClient) as unknown as Record<
    PropertyKey,
    unknown
  >;

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
    create table order_items (
      id integer generated always as identity primary key,
      order_id integer not null references orders(id) on delete restrict,
      kind text not null,
      description text not null,
      quantity integer not null,
      unit_cents integer not null,
      total_cents integer,
      discounts jsonb not null default '[]',
      taxes jsonb not null default '[]'
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
      check (status <> 'succeeded' or method is not null),
      check ((status in ('succeeded', 'failed', 'canceled')) = (finished_at is not null))
    );
    create table test_holds (
      id integer generated always as identity primary key,
      order_item_id integer not null unique references order_items(id),
      expires_at timestamptz not null
    );
    create table tax_regions (
      id integer generated always as identity primary key,
      created_by integer,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      country_code varchar(2) not null,
      region_code varchar(64) not null,
      rates jsonb not null default '[]'
    );
    create table checkout_test_users (
      id integer primary key,
      given_name text not null default '',
      family_name text not null default '',
      email text not null,
      address_line_1 text not null default '',
      address_line_2 text not null default '',
      locality text not null default '',
      region_code text not null default '',
      postal_code text not null default '',
      country_code text not null default '',
      stripe_customer_id text
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
  vi.clearAllMocks();
  mocks.intents.clear();
  mocks.nextStatus = "succeeded";
  holdGate = undefined;
  holdError = undefined;
  await sqlClient.unsafe(`
    truncate audit_logs, test_holds, transactions, order_items, orders, tax_regions, checkout_test_users restart identity;
    insert into checkout_test_users (id, given_name, family_name, email, stripe_customer_id)
      values (7, 'Patron', 'Example', 'patron@example.test', 'cus_fixture');
    insert into tax_regions (country_code, region_code, rates)
      values ('CA', 'BC', '[{"id":"gst","code":"GST","name":"GST","ratePercent":"5","categories":["privateScreening"]}]');
  `);
  mocks.stripe.customers.retrieve.mockImplementation(async () => ({
    id: "cus_fixture",
    deleted: false,
    livemode: false,
    metadata: { memberId: "7" },
  }));
  mocks.stripe.customerSessions.create.mockImplementation(async () => ({
    client_secret: "cuss_secret_fixture",
  }));
  mocks.stripe.paymentIntents.list.mockImplementation(() =>
    Array.from(mocks.intents.values()),
  );
  mocks.stripe.paymentIntents.create.mockImplementation(
    async (data: Stripe.PaymentIntentCreateParams) => {
      const intent = {
        id: `pi_${mocks.intents.size + 1}`,
        amount: data.amount,
        currency: data.currency,
        metadata: data.metadata as Record<string, string>,
        status: mocks.nextStatus,
      };
      mocks.intents.set(intent.id, intent);
      return intent;
    },
  );
  mocks.stripe.paymentIntents.confirm.mockImplementation(async (id: string) =>
    mocks.intents.get(id),
  );
  mocks.stripe.paymentIntents.cancel.mockImplementation(async (id: string) => {
    const intent = mocks.intents.get(id)!;
    intent.status = "canceled";
    return intent;
  });
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

async function call(
  stage: Parameters<typeof pipeline>[1],
  body: Record<string, unknown>,
) {
  const response = await pipeline(
    {
      request: new NextRequest("http://localhost/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    },
    stage,
  );
  return { status: response.status, body: await response.json() };
}
async function loadFingerprint(id?: string) {
  return (await call(checkout.session, { id, choices: { guests: 5 } })).body
    .quote.fingerprint as string;
}
function pay(id: string, fingerprint: string, previousTransactionId?: number) {
  return call(checkout.pay, {
    id,
    choices: { guests: 5 },
    fingerprint,
    confirmationTokenId: "ctoken_fixture",
    previousTransactionId,
  });
}
async function countLockWaiters() {
  const [{ count }] =
    await observer`select count(*)::int as count from pg_stat_activity where application_name = 'checkout-app' and wait_event_type = 'Lock'`;
  return count as number;
}

it("commits one order and creates one PaymentIntent for a concurrent Pay replay", async () => {
  const fingerprint = await loadFingerprint();
  const reachedProvider = Promise.withResolvers<void>();
  const releaseProvider = Promise.withResolvers<void>();
  const createIntent =
    mocks.stripe.paymentIntents.create.getMockImplementation()!;
  mocks.stripe.paymentIntents.create.mockImplementationOnce(async (data) => {
    reachedProvider.resolve();
    await releaseProvider.promise;
    return createIntent(data);
  });
  const first = pay("checkoutflow001", fingerprint);
  await reachedProvider.promise;
  const second = pay("checkoutflow001", fingerprint);
  try {
    await expect.poll(countLockWaiters).toBeGreaterThan(0);
  } finally {
    releaseProvider.resolve();
  }
  const results = await Promise.all([first, second]);
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  expect(results.map((result) => result.body.paymentStatus)).toEqual([
    "succeeded",
    "succeeded",
  ]);
  expect(mocks.stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  expect(await sqlClient`select id from orders`).toHaveLength(1);
  expect(await sqlClient`select id from order_items`).toHaveLength(1);
  expect(await sqlClient`select id from transactions`).toHaveLength(1);
  expect(await sqlClient`select id from test_holds`).toHaveLength(1);
});

it("makes drop wait for a Pay parked inside hold and never reports a charged order dropped", async () => {
  const fingerprint = await loadFingerprint();
  const reachedHold = Promise.withResolvers<void>();
  const releaseHold = Promise.withResolvers<void>();
  holdGate = { reached: reachedHold.resolve, release: releaseHold.promise };
  const paying = pay("checkoutflow001", fingerprint);
  await reachedHold.promise;
  const dropping = call(checkout.drop, { id: "checkoutflow001" });
  try {
    await expect.poll(countLockWaiters).toBeGreaterThan(0);
  } finally {
    releaseHold.resolve();
  }
  const [paid, dropped] = await Promise.all([paying, dropping]);
  expect([paid.status, dropped.status]).toEqual([200, 200]);
  // Drop saw the committed order, so which reconciliation ran first decides the outcome; either
  // way "dropped" and a charge never coexist.
  const charged = Array.from(mocks.intents.values()).some(
    (intent) => intent.status === "succeeded",
  );
  expect(dropped.body.outcome === "dropped").toBe(!charged);
  expect(paid.body.paymentStatus === "succeeded").toBe(charged);
  const [order] = await sqlClient`select status from orders`;
  expect(order.status).toBe(charged ? "active" : "canceled");
});

it("survives retry, expiry and event reconciliation racing on one order without a deadlock", async () => {
  for (let round = 1; round <= 5; round += 1) {
    const id = `checkoutround0${round}`;
    const fingerprint = await loadFingerprint();
    mocks.nextStatus = "failed";
    const first = (await pay(id, fingerprint)).body;
    expect(first.paymentStatus).toBe("failed");
    mocks.nextStatus = "succeeded";
    const [retry, expired, event] = await Promise.allSettled([
      pay(id, fingerprint, first.transactionId),
      payments.reconcileOrder(first.id, { expire: true }),
      payments.reconcileOrder(first.id, {
        event: { type: "payment_intent.succeeded" } as Stripe.Event,
      }),
    ]);
    expect(expired.status).toBe("fulfilled");
    expect(event.status).toBe("fulfilled");
    expect(retry.status).toBe("fulfilled");
    if (retry.status !== "fulfilled") continue;
    // Expiry may win and cancel the order; the retry is then refused, never half-applied.
    expect([200, 409]).toContain(retry.value.status);
    const [order] =
      await sqlClient`select status from orders where id = ${first.id}`;
    const succeeded =
      await sqlClient`select id from transactions where order_id = ${first.id} and status = 'succeeded'`;
    expect(succeeded.length).toBeLessThanOrEqual(1);
    expect(order.status === "canceled" && succeeded.length > 0).toBe(false);
    if (retry.value.status === 200 && succeeded.length)
      expect(retry.value.body.paymentStatus).toBe("succeeded");
    expect(
      Array.from(mocks.intents.values()).filter(
        (intent) =>
          intent.metadata.orderId === String(first.id) &&
          intent.status === "succeeded",
      ).length,
    ).toBe(succeeded.length);
  }
  expect(mocks.reportError).not.toHaveBeenCalled();
});

it("leaves nothing behind when hold throws", async () => {
  const fingerprint = await loadFingerprint();
  holdError = new ReturnedError("That time was just reserved.", {
    status: 409,
    code: "hold_failed",
  });
  const response = await pay("checkoutflow001", fingerprint);
  expect(response.status).toBe(409);
  expect(response.body.code).toBe("hold_failed");
  expect(await sqlClient`select id from orders`).toHaveLength(0);
  expect(await sqlClient`select id from order_items`).toHaveLength(0);
  expect(await sqlClient`select id from transactions`).toHaveLength(0);
  expect(await sqlClient`select id from test_holds`).toHaveLength(0);
  expect(await sqlClient`select id from audit_logs`).toHaveLength(0);
  expect(mocks.stripe.paymentIntents.create).not.toHaveBeenCalled();
});

it("keeps the fingerprint equal after the saved taxes make a JSONB round trip", async () => {
  const fingerprint = await loadFingerprint();
  expect((await pay("checkoutflow001", fingerprint)).status).toBe(200);
  const [item] = await sqlClient`select taxes from order_items`;
  expect(item.taxes).toEqual([
    {
      id: "gst",
      code: "GST",
      name: "GST",
      rate: 5,
      isIncluded: true,
      amountCents: 1071,
    },
  ]);
  expect(await loadFingerprint("checkoutflow001")).toBe(fingerprint);
});
