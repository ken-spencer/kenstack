import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const mocks = vi.hoisted(() => ({
  database: undefined as unknown as Record<PropertyKey, unknown>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: new Proxy({}, { get: (_target, property) => mocks.database[property] }),
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getFreshCurrentUser: async () => ({ id: 7, roles: ["admin"] }),
}));

import { orderListSchema } from "@kenstack/payments/orders/query";
import { listOrders } from "@kenstack/payments/orders/queries";
import { startTestPostgres } from "../postgres";

let cluster: Awaited<ReturnType<typeof startTestPostgres>>;
let sqlClient: ReturnType<typeof postgres>;

beforeAll(async () => {
  cluster = await startTestPostgres();
  sqlClient = postgres({
    ...cluster.connection,
    max: 2,
    prepare: false,
    connection: { application_name: "orders-app", statement_timeout: 5000 },
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
    insert into orders (request_id, user_id, channel, currency, customer_snapshot, status, payment_count)
      values ('ordercancelled0', 8, 'website', 'cad', '{}', 'canceled', 1),
             ('orderdeclined01', 8, 'website', 'cad', '{}', 'canceled', 1),
             ('orderrefunded01', 8, 'website', 'cad', '{}', 'canceled', 1),
             ('orderactive0001', 8, 'website', 'cad', '{}', 'active', 1);
    insert into transactions (order_id, kind, total_cents, method, status, finished_at)
      values (10002, 'payment', 22500, 'credit', 'succeeded', now()),
             (10003, 'payment', 22500, 'credit', 'succeeded', now()),
             (10004, 'payment', 22500, 'credit', 'failed', now());
    insert into transactions (order_id, kind, original_transaction_id, total_cents, method, status, finished_at)
      values (10003, 'refund', (select id from transactions where order_id = 10003),
        -22500, 'credit', 'succeeded', now());
  `);
});

afterAll(async () => {
  try {
    await sqlClient?.end({ timeout: 5 });
  } finally {
    await cluster?.stop();
  }
});

// Changing a selection after a declined card cancels that order and starts another, so staff see a
// cancelled order only once it collected money, until they ask for the rest.
it("hides the cancelled order that never collected money until the filter reveals it", async () => {
  const hidden = await listOrders(orderListSchema.parse({ search: {} }));
  expect(hidden.orders.map((order) => order.id)).toEqual([10004, 10003, 10002]);
  expect(hidden.total).toBe(3);
  const revealed = await listOrders(
    orderListSchema.parse({ search: { showCancelledUnpaid: "true" } }),
  );
  expect(revealed.orders.map((order) => order.id)).toEqual([
    10004, 10003, 10002, 10001,
  ]);
  expect(revealed.total).toBe(4);
});
