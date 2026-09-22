import {
  getTableColumns,
  getTableName,
  type Column,
  type SQL,
  type Table,
} from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  database: undefined as unknown as Record<PropertyKey, unknown>,
  user: { id: 7, email: "patron@example.test" },
  audits: [] as Record<string, unknown>[],
  reportError: vi.fn<(error: unknown) => Promise<void>>(async () => undefined),
  // Background work the response does not wait for; tests await it to see the alert.
  background: [] as Promise<unknown>[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@vercel/functions", () => ({
  waitUntil: (promise: Promise<unknown>) => {
    mocks.background.push(promise);
  },
}));
vi.mock("@app/db", () => ({
  db: new Proxy({}, { get: (_target, key) => mocks.database[key] }),
}));
vi.mock("@kenstack/auth/server/auth", () => ({
  hasAccess: async () => true,
  isAuthenticated: async () => true,
}));
vi.mock("@kenstack/auth/server/user", () => ({
  requireUser: async () => ({ ...mocks.user }),
  getFreshCurrentUser: async () => ({ ...mocks.user }),
}));
vi.mock("@kenstack/api/quota", () => ({ claimQuota: async () => null }));
vi.mock("@kenstack/lib/errorReporter", () => ({
  reportError: mocks.reportError,
}));
vi.mock("@kenstack/logger", () => ({
  audit: async (entry: Record<string, unknown>) => {
    mocks.audits.push(entry);
  },
}));
vi.mock("@kenstack/payments/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@kenstack/payments/server")>()),
  loadStripeConfig: () => ({
    livemode: false,
    publishableKey: "pk_test_fixture",
  }),
}));

import * as z from "zod";
import { addressColumns, defineTable } from "@kenstack/admin/table";
import pipeline from "@kenstack/api/pipeline";
import { ReturnedError } from "@kenstack/api/errors";
import { userColumns } from "@kenstack/modules/users/tables";
import { createCheckout } from "@kenstack/payments/checkout/server";
import type { transactions } from "@kenstack/payments/tables";

type Status = (typeof transactions.$inferSelect)["status"];
type Row = Record<string, unknown>;
const users = defineTable({
  name: "checkout_test_users",
  columns: { ...userColumns, ...addressColumns },
});

// An in-memory stand-in for the Drizzle operations checkout uses. Equality conditions filter rows;
// "is null" conditions are ignored because no fixture row is soft-deleted.
const dialect = new PgDialect();
let rows: Record<string, Row[]>;
let nextId: number;
// Open from a transaction's start to its commit or rollback, which releases its advisory lock.
let inTransaction = false;
const insertDefaults: Record<string, Row> = {
  orders: { status: "active", coverFees: false, stripeSubscriptionId: null },
  order_items: {},
  transactions: {
    status: "pending",
    instalment: null,
    stripeInvoiceId: null,
    stripePaymentIntentId: null,
  },
};
function project(table: Table, fields: Record<string, Column> | undefined) {
  const columns = Object.entries(getTableColumns(table));
  return (row: Row) =>
    fields
      ? Object.fromEntries(
          Object.entries(fields).map(([key, column]) => [
            key,
            row[columns.find(([, candidate]) => candidate === column)![0]],
          ]),
        )
      : row;
}
const database = {
  execute: async () => undefined,
  select(fields?: Record<string, Column>) {
    let table: Table;
    let result: Row[];
    const query = {
      from(value: Table) {
        table = value;
        result = [...rows[getTableName(value)]];
        return query;
      },
      where(condition: SQL) {
        const { sql, params } = dialect.sqlToQuery(condition);
        const columns = Object.entries(getTableColumns(table));
        for (const [, name, index] of sql.matchAll(
          /"[^"]+"\."([^"]+)" = \$(\d+)/g,
        )) {
          const key = columns.find(([, column]) => column.name === name)![0];
          result = result.filter(
            (row) => row[key] === params[Number(index) - 1],
          );
        }
        return query;
      },
      orderBy(order: SQL) {
        if (dialect.sqlToQuery(order).sql.endsWith(" desc")) result.reverse();
        return query;
      },
      limit(count: number) {
        result = result.slice(0, count);
        return query;
      },
      for: () => query,
      then: (resolve: (value: Row[]) => unknown, reject: () => unknown) =>
        Promise.resolve(result.map(project(table, fields))).then(
          resolve,
          reject,
        ),
    };
    return query;
  },
  insert: (table: Table) => ({
    values(input: Row | Row[]) {
      const name = getTableName(table);
      const created = [input].flat().map((value) => {
        const row: Row = {
          ...insertDefaults[name],
          ...Object.fromEntries(
            Object.entries(value).filter(([, item]) => item !== undefined),
          ),
          id: nextId++,
        };
        // JSONB returns object keys in its own order, never the inserted order.
        if (name === "order_items")
          row.taxes = (row.taxes as Row[]).map((tax) =>
            Object.fromEntries(Object.entries(tax).reverse()),
          );
        rows[name].push(row);
        return row;
      });
      return {
        returning: async (fields?: Record<string, Column>) =>
          created.map(project(table, fields)),
      };
    },
  }),
  async transaction(run: (tx: unknown) => unknown) {
    const saved = structuredClone(rows);
    inTransaction = true;
    try {
      return await run(database);
    } catch (error) {
      rows = saved;
      throw error;
    } finally {
      inTransaction = false;
    }
  },
};
mocks.database = database;

// Provider behaviour as a function of the saved rows: a confirmation settles a pending attempt as
// `confirmStatus`, and an abandonment does whatever the case under test says Stripe allowed.
let confirmStatus: Status;
let confirmations: { confirmationTokenId: string; returnUrl: string }[];
let abandon: (order: Row, attempts: Row[]) => void;
let reconciledInTransaction: boolean[];
const reconcileOrder = vi.fn(
  async (
    id: number,
    options: {
      confirm?: (typeof confirmations)[number];
      abandon?: boolean;
    } = {},
  ) => {
    reconciledInTransaction.push(inTransaction);
    const order = rows.orders.find((row) => row.id === id)!;
    const attempts = rows.transactions.filter((row) => row.orderId === id);
    if (options.abandon) abandon(order, attempts);
    const attempt = attempts.at(-1)!;
    if (
      options.confirm &&
      order.status === "active" &&
      attempt.status === "pending"
    ) {
      confirmations.push(options.confirm);
      attempt.status = confirmStatus;
    }
    return {
      id,
      sessionId: order.requestId as string,
      transactionId: attempt.id as number,
      paymentStatus: attempts.some((row) => row.status === "succeeded")
        ? "succeeded"
        : (attempt.status as Status),
      amountCents: attempt.totalCents as number,
      paymentCount: order.paymentCount as number | null,
      livemode: false,
      items: [],
      clientSecret: null,
    };
  },
);

const defineCheckout = createCheckout({
  payments: {
    reconcileOrder,
    createCheckoutCustomerSession: async () => "cuss_secret_fixture",
  },
  users,
  currency: "cad",
});

// What the site's catalogue currently prices; tests change it to model a change on our side.
type Quote = Awaited<ReturnType<typeof lines>>;
let catalogue: {
  lines: {
    kind: string;
    description: string;
    quantity: number;
    unitCents: number;
    taxCategory?: string;
  }[];
  schedule:
    | { type: "once" }
    | { type: "monthly" }
    | { type: "instalments"; count: number };
  tax?: { countryCode: string; regionCode: string; included: boolean };
  coverFees?: boolean;
};
const lines = vi.fn(async ({ choices }: { choices: { guests: number } }) => ({
  ...catalogue,
  guests: choices.guests,
}));
const hold = vi.fn<
  (context: {
    quote: Quote;
    items: { id: number; kind: string }[];
  }) => Promise<{ expiresAt: Date }>
>(async () => ({ expiresAt: new Date("2026-09-21T18:00:00.000Z") }));
const extend = vi.fn(async () => undefined);
const product = {
  name: "screening",
  schema: z.object({ guests: z.number().int().positive() }),
  lines,
  reservation: { hold, extend },
  returnPath: "/private-screenings/complete",
};
const checkout = defineCheckout(product);

const id = "checkoutflow001";
const screening = {
  kind: "private_screening",
  description: "Civic private screening",
  quantity: 1,
  unitCents: 22_500,
  taxCategory: "privateScreening",
};
const gst = {
  id: "gst",
  code: "GST",
  name: "GST",
  ratePercent: "5",
  categories: ["privateScreening", "concession"],
};

async function call(
  stage: Parameters<typeof pipeline>[1],
  body: Record<string, unknown>,
) {
  const response = await pipeline(
    {
      request: new NextRequest("https://example.test/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
    },
    stage,
  );
  return { status: response.status, body: await response.json() };
}
async function loadFingerprint(choices = { guests: 5 }) {
  return (await call(checkout.session, { choices })).body.quote
    .fingerprint as string;
}
async function pay(
  body: Record<string, unknown> = {},
  stages: Pick<typeof checkout, "pay"> = checkout,
) {
  return call(stages.pay, {
    id,
    choices: { guests: 5 },
    fingerprint: await loadFingerprint(),
    confirmationTokenId: "ctoken_fixture",
    ...body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.id = 7;
  mocks.audits.length = 0;
  mocks.background.length = 0;
  reconciledInTransaction = [];
  nextId = 1;
  confirmStatus = "succeeded";
  confirmations = [];
  abandon = () => undefined;
  catalogue = {
    lines: [{ ...screening }],
    schedule: { type: "once" },
    tax: { countryCode: "CA", regionCode: "BC", included: true },
  };
  rows = {
    orders: [],
    order_items: [],
    transactions: [],
    tax_regions: [{ countryCode: "CA", regionCode: "BC", rates: [gst] }],
    checkout_test_users: [
      {
        id: 7,
        givenName: "Patron",
        familyName: "Example",
        email: "patron@example.test",
        addressLine1: "",
        addressLine2: "",
        locality: "",
        regionCode: "",
        postalCode: "",
        countryCode: "",
      },
    ],
  };
});

describe("pricing", () => {
  it("multiplies quantity by unit price for an untaxed one-time line", async () => {
    catalogue.lines = [
      {
        kind: "concession",
        description: "Popcorn",
        quantity: 3,
        unitCents: 1_250,
      },
    ];
    const { body } = await call(checkout.session, { choices: { guests: 5 } });
    expect(body).toMatchObject({
      publishableKey: "pk_test_fixture",
      customerSessionClientSecret: "cuss_secret_fixture",
      retired: false,
      quote: {
        lines: [{ quantity: 3, unitCents: 1_250, totalCents: 3_750 }],
        totalCents: 3_750,
        dueNowCents: 3_750,
        recurringCents: null,
        schedule: { type: "once" },
      },
    });
  });

  it("extracts included GST from the listed price without changing the total", async () => {
    const { quote } = (await call(checkout.session, { choices: { guests: 5 } }))
      .body;
    expect(quote.totalCents).toBe(22_500);
    expect(quote.lines[0].taxes).toEqual([
      {
        id: "gst",
        code: "GST",
        name: "GST",
        rate: 5,
        isIncluded: true,
        amountCents: 1_071,
      },
    ]);
  });

  it("adds excluded tax and gives a shared rate's rounding remainder to one line", async () => {
    catalogue.tax = { countryCode: "CA", regionCode: "BC", included: false };
    catalogue.lines = ["Popcorn", "Candy"].map((description) => ({
      kind: "concession",
      description,
      quantity: 1,
      unitCents: 1_010,
      taxCategory: "concession",
    }));
    const { quote } = (await call(checkout.session, { choices: { guests: 5 } }))
      .body;
    expect(
      quote.lines.map((line: { totalCents: number }) => line.totalCents),
    ).toEqual([1_061, 1_060]);
    expect(quote.totalCents).toBe(2_121);
  });

  it("splits 100,000 over 12 instalments as 8,337 now and 8,333 monthly", async () => {
    catalogue = {
      lines: [
        {
          kind: "sponsorship",
          description: "Seat sponsorship",
          quantity: 1,
          unitCents: 100_000,
        },
      ],
      schedule: { type: "instalments", count: 12 },
    };
    expect(
      (await call(checkout.session, { choices: { guests: 5 } })).body.quote,
    ).toMatchObject({
      totalCents: 100_000,
      dueNowCents: 8_337,
      recurringCents: 8_333,
      schedule: { type: "instalments", count: 12 },
    });
  });

  it.each([49, 100_000_000])(
    "refuses a %s cent payment as outside the provider's bounds",
    async (unitCents) => {
      catalogue = {
        lines: [
          { kind: "donation", description: "Gift", quantity: 1, unitCents },
        ],
        schedule: { type: "once" },
      };
      const response = await call(checkout.session, {
        choices: { guests: 5 },
      });
      expect(response.status).toBe(400);
      expect(response.body.quote).toBeUndefined();
    },
  );

  it("refuses 149 cents over 3 instalments because 49 monthly is under the minimum", async () => {
    catalogue = {
      lines: [
        { kind: "donation", description: "Gift", quantity: 1, unitCents: 149 },
      ],
      schedule: { type: "instalments", count: 3 },
    };
    const response = await call(checkout.session, { choices: { guests: 5 } });
    expect(response.status).toBe(400);
    expect(response.body.quote).toBeUndefined();
    catalogue.lines[0].unitCents = 150;
    expect(
      (await call(checkout.session, { choices: { guests: 5 } })).body.quote,
    ).toMatchObject({ dueNowCents: 50, recurringCents: 50 });
  });

  it("names the currency the host configured in the bounds message", async () => {
    catalogue = {
      lines: [
        { kind: "donation", description: "Gift", quantity: 1, unitCents: 49 },
      ],
      schedule: { type: "once" },
    };
    const stages = createCheckout({
      payments: {
        reconcileOrder,
        createCheckoutCustomerSession: async () => "cuss_secret_fixture",
      },
      users,
      currency: "usd",
    })(product);
    expect(
      (await call(stages.session, { choices: { guests: 5 } })).body.message,
    ).toBe("Each payment must be between US$0.50 and US$999,999.99.");
  });

  it.each<[string, () => void]>([
    ["quantity", () => (catalogue.lines[0].quantity = 1.5)],
    ["quantity", () => (catalogue.lines[0].quantity = 0)],
    ["unitCents", () => (catalogue.lines[0].unitCents = 22_500.5)],
    ["unitCents", () => (catalogue.lines[0].unitCents = -1)],
    [
      "schedule count",
      () => (catalogue.schedule = { type: "instalments", count: 2.5 }),
    ],
    [
      "schedule count",
      () => (catalogue.schedule = { type: "instalments", count: 0 }),
    ],
  ])(
    "throws naming the product and the %s when the site returns a bad integer",
    async (field, change) => {
      const fingerprint = await loadFingerprint();
      change();
      expect(
        (await call(checkout.session, { choices: { guests: 5 } })).status,
      ).toBe(500);
      expect(String(mocks.reportError.mock.calls[0][0])).toContain(field);
      expect(String(mocks.reportError.mock.calls[0][0])).toContain("screening");
      expect(
        (
          await call(checkout.pay, {
            id,
            choices: { guests: 5 },
            fingerprint,
            confirmationTokenId: "ctoken_fixture",
          })
        ).status,
      ).toBe(500);
      expect(rows).toMatchObject({ orders: [], transactions: [] });
    },
  );

  it("throws for a line with a tax category when the site returns no tax region", async () => {
    delete catalogue.tax;
    expect(
      (await call(checkout.session, { choices: { guests: 5 } })).status,
    ).toBe(500);
    expect(String(mocks.reportError.mock.calls[0][0])).toContain(
      "no tax region",
    );
  });

  it.each([
    { quantity: 2, taxCategory: undefined },
    { quantity: 1, taxCategory: "concession" },
  ])(
    "rejects a monthly line Stripe would bill differently: %o",
    async (line) => {
      catalogue.schedule = { type: "monthly" };
      catalogue.lines = [
        {
          kind: "donation",
          description: "Monthly gift",
          unitCents: 2_500,
          ...line,
        },
      ];
      expect(
        (await call(checkout.session, { choices: { guests: 5 } })).status,
      ).toBe(500);
    },
  );

  it("sells a taxed line with zero tax and alerts staff once when its region is missing", async () => {
    rows.tax_regions = [];
    const { quote } = (await call(checkout.session, { choices: { guests: 5 } }))
      .body;
    expect(quote.lines[0]).toMatchObject({ totalCents: 22_500, taxes: [] });
    await Promise.all(mocks.background);
    expect(mocks.background).toHaveLength(1);
    expect(mocks.reportError).toHaveBeenCalledOnce();
    expect(String(mocks.reportError.mock.calls[0][0])).toContain("CA-BC");
    expect(String(mocks.reportError.mock.calls[0][0])).toContain("screening");
    expect((await pay()).body.paymentStatus).toBe("succeeded");
    expect(rows.order_items).toMatchObject([{ totalCents: 22_500, taxes: [] }]);
  });

  it("stays silent when the region exists without a rate for the line's category", async () => {
    rows.tax_regions[0].rates = [{ ...gst, categories: ["concession"] }];
    const { quote } = (await call(checkout.session, { choices: { guests: 5 } }))
      .body;
    expect(quote.lines[0].taxes).toEqual([]);
    expect(mocks.reportError).not.toHaveBeenCalled();
  });
});

describe("fingerprint", () => {
  it.each<[string, () => void]>([
    ["unit price", () => (catalogue.lines[0].unitCents = 23_000)],
    [
      "included rate at the same total",
      () => (rows.tax_regions[0].rates = [{ ...gst, ratePercent: "7" }]),
    ],
    ["description", () => (catalogue.lines[0].description = "Renamed")],
    ["removed line", () => catalogue.lines.pop()],
    [
      "schedule",
      () => (catalogue.schedule = { type: "instalments", count: 2 }),
    ],
  ])("changes with the %s", async (_name, change) => {
    catalogue.lines.push({
      kind: "concession",
      description: "Popcorn",
      quantity: 2,
      unitCents: 800,
    });
    const before = (await call(checkout.session, { choices: { guests: 5 } }))
      .body.quote;
    change();
    const after = (await call(checkout.session, { choices: { guests: 5 } }))
      .body.quote;
    expect(after.fingerprint).not.toBe(before.fingerprint);
    if (_name === "included rate at the same total")
      expect(after.totalCents).toBe(before.totalCents);
  });

  it("changes with an excluded rate", async () => {
    catalogue.tax = { countryCode: "CA", regionCode: "BC", included: false };
    const before = await loadFingerprint();
    rows.tax_regions[0].rates = [{ ...gst, ratePercent: "7" }];
    expect(await loadFingerprint()).not.toBe(before);
  });

  it.each<[string, Partial<typeof gst>]>([
    ["name", { name: "Goods and Services Tax" }],
    ["code", { code: "GST/HST" }],
  ])(
    "changes with the tax %s, and the saved order still matches",
    async (_name, change) => {
      const before = await loadFingerprint();
      rows.tax_regions[0].rates = [{ ...gst, ...change }];
      const renamed = await loadFingerprint();
      expect(renamed).not.toBe(before);
      await pay({ fingerprint: renamed });
      const saved = await call(checkout.session, {
        id,
        choices: { guests: 5 },
      });
      expect(saved.body.quote.fingerprint).toBe(renamed);
    },
  );

  it("is equal for the saved order although JSONB reordered its tax keys", async () => {
    const fresh = await loadFingerprint();
    await pay();
    expect(Object.keys((rows.order_items[0].taxes as Row[])[0])).not.toEqual([
      "id",
      "code",
      "name",
      "rate",
      "isIncluded",
      "amountCents",
    ]);
    const saved = await call(checkout.session, { id, choices: { guests: 5 } });
    expect(saved.body.quote.fingerprint).toBe(fresh);
  });
});

describe("pay", () => {
  it("saves the order, items, attempt and audit, and hands hold the item ids in line order", async () => {
    catalogue.lines.push({
      kind: "concession",
      description: "Popcorn",
      quantity: 2,
      unitCents: 800,
      taxCategory: "concession",
    });
    catalogue.coverFees = true;
    const response = await pay();
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      sessionId: id,
      paymentStatus: "succeeded",
      amountCents: 24_100,
    });
    expect(rows.orders).toMatchObject([
      {
        requestId: id,
        userId: 7,
        channel: "website",
        currency: "cad",
        status: "active",
        paymentCount: 1,
        monthlyCents: null,
        coverFees: true,
        customerSnapshot: { givenName: "Patron", familyName: "Example" },
      },
    ]);
    expect(rows.order_items).toMatchObject([
      { orderId: rows.orders[0].id, kind: "private_screening" },
      { orderId: rows.orders[0].id, kind: "concession", totalCents: 1_600 },
    ]);
    expect(rows.transactions).toMatchObject([
      { kind: "payment", instalment: null, totalCents: 24_100 },
    ]);
    expect(mocks.audits).toMatchObject([
      {
        action: "payment.accepted",
        table: "transactions",
        rowId: rows.transactions[0].id,
        data: {
          orderId: rows.orders[0].id,
          holdExpiresAt: "2026-09-21T18:00:00.000Z",
          livemode: false,
        },
      },
    ]);
    const held = hold.mock.calls[0][0];
    expect(held.items.map((item) => [item.id, item.kind])).toEqual(
      rows.order_items.map((item) => [item.id, item.kind]),
    );
    expect(held.quote.guests).toBe(5);
    expect(confirmations).toEqual([
      {
        confirmationTokenId: "ctoken_fixture",
        returnUrl: `https://example.test/private-screenings/complete?session_id=${id}`,
      },
    ]);
  });

  it("saves a monthly order with null item totals and its monthly amount", async () => {
    catalogue = {
      lines: [
        {
          kind: "donation",
          description: "Monthly gift",
          quantity: 1,
          unitCents: 2_500,
        },
        {
          kind: "fee_cover",
          description: "Processing fees",
          quantity: 1,
          unitCents: 75,
        },
      ],
      schedule: { type: "monthly" },
    };
    expect((await pay()).status).toBe(200);
    expect(rows.orders).toMatchObject([
      { paymentCount: null, monthlyCents: 2_575 },
    ]);
    expect(rows.order_items.map((item) => item.totalCents)).toEqual([
      null,
      null,
    ]);
    expect(rows.transactions).toMatchObject([
      { instalment: 1, totalCents: 2_575 },
    ]);
  });

  it("saves an instalments attempt as instalment 1 for the first-payment amount", async () => {
    catalogue = {
      lines: [
        {
          kind: "sponsorship",
          description: "Seat sponsorship",
          quantity: 1,
          unitCents: 100_000,
        },
      ],
      schedule: { type: "instalments", count: 12 },
    };
    expect((await pay()).body.amountCents).toBe(8_337);
    expect(rows.orders).toMatchObject([
      { paymentCount: 12, monthlyCents: null },
    ]);
    expect(rows.order_items).toMatchObject([{ totalCents: 100_000 }]);
    expect(rows.transactions).toMatchObject([
      { kind: "payment", instalment: 1, totalCents: 8_337 },
    ]);
  });

  it("closes its transaction, releasing the per-user lock, before every reconcile", async () => {
    confirmStatus = "failed";
    const fingerprint = await loadFingerprint();
    const first = (await pay({ fingerprint })).body;
    expect(reconciledInTransaction).toEqual([false]);
    await pay({ fingerprint, previousTransactionId: first.transactionId });
    expect(reconciledInTransaction).toEqual([false, false, false]);
    expect(confirmations).toHaveLength(2);
  });

  it("saves nothing, holds nothing and confirms nothing for a stale fingerprint", async () => {
    const fingerprint = await loadFingerprint();
    catalogue.lines[0].unitCents = 25_000;
    const response = await pay({ fingerprint });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe("checkout_lines_changed");
    expect(rows).toMatchObject({
      orders: [],
      order_items: [],
      transactions: [],
    });
    expect(hold).not.toHaveBeenCalled();
    expect(confirmations).toEqual([]);
  });

  it("charges the saved order on a retry with different choices, extending without re-pricing", async () => {
    confirmStatus = "failed";
    const fingerprint = await loadFingerprint();
    const first = (await pay({ fingerprint })).body;
    expect(first.paymentStatus).toBe("failed");
    catalogue.lines[0].unitCents = 99_900;
    lines.mockClear();
    confirmStatus = "succeeded";
    const retry = await call(checkout.pay, {
      id,
      choices: { guests: 40 },
      fingerprint,
      confirmationTokenId: "ctoken_retry",
      previousTransactionId: first.transactionId,
    });
    expect(retry.body).toMatchObject({
      paymentStatus: "succeeded",
      amountCents: 22_500,
    });
    expect(retry.body.transactionId).not.toBe(first.transactionId);
    expect(rows.orders).toHaveLength(1);
    expect(rows.order_items).toHaveLength(1);
    expect(lines).not.toHaveBeenCalled();
    expect(extend).toHaveBeenCalledOnce();
  });

  it("refuses a retry whose displayed fingerprint is not the saved order's", async () => {
    confirmStatus = "failed";
    const first = (await pay()).body;
    catalogue.lines[0].unitCents = 99_900;
    const retry = await pay({ previousTransactionId: first.transactionId });
    expect(retry.body.code).toBe("checkout_lines_changed");
    expect(rows.transactions).toHaveLength(1);
  });

  it("passes the site's error through and adds no attempt when extend throws", async () => {
    confirmStatus = "failed";
    const fingerprint = await loadFingerprint();
    const first = (await pay({ fingerprint })).body;
    extend.mockRejectedValueOnce(
      new ReturnedError("That time is no longer available.", {
        status: 409,
        code: "screening_unavailable",
      }),
    );
    const retry = await pay({
      fingerprint,
      previousTransactionId: first.transactionId,
    });
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe("screening_unavailable");
    expect(rows.transactions).toHaveLength(1);
    expect(confirmations).toHaveLength(1);
  });

  it("adds no attempt when Pay is replayed while the payment is processing", async () => {
    confirmStatus = "processing";
    const fingerprint = await loadFingerprint();
    const first = (await pay({ fingerprint })).body;
    const replay = await pay({
      fingerprint,
      previousTransactionId: first.transactionId,
    });
    expect(replay.body).toMatchObject({
      paymentStatus: "processing",
      transactionId: first.transactionId,
    });
    expect(rows.transactions).toHaveLength(1);
    expect(confirmations).toHaveLength(1);
  });

  it("answers checkout_expired for an order cancelled on our side", async () => {
    confirmStatus = "failed";
    const fingerprint = await loadFingerprint();
    const first = (await pay({ fingerprint })).body;
    rows.orders[0].status = "canceled";
    rows.transactions[0].status = "canceled";
    const retry = await pay({
      fingerprint,
      previousTransactionId: first.transactionId,
    });
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe("checkout_expired");
    expect(rows.transactions).toHaveLength(1);
  });

  it("returns the success for a cancelled order whose payment in fact succeeded", async () => {
    const fingerprint = await loadFingerprint();
    await pay({ fingerprint });
    rows.orders[0].status = "canceled";
    const replay = await pay({ fingerprint });
    expect(replay.status).toBe(200);
    expect(replay.body.paymentStatus).toBe("succeeded");
    expect(rows.transactions).toHaveLength(1);
    expect(confirmations).toHaveLength(1);
  });

  it("answers 404 for another user's id and reports it dropped without consulting the provider", async () => {
    const fingerprint = await loadFingerprint();
    await pay({ fingerprint });
    mocks.user.id = 8;
    rows.checkout_test_users.push({
      ...rows.checkout_test_users[0],
      id: 8,
    });
    reconcileOrder.mockClear();
    expect((await pay({ fingerprint })).status).toBe(404);
    expect((await call(checkout.drop, { id })).body).toMatchObject({
      outcome: "dropped",
    });
    expect((await call(checkout.status, { sessionId: id })).status).toBe(404);
    expect(reconcileOrder).not.toHaveBeenCalled();
    expect(rows.orders).toMatchObject([{ userId: 7, status: "active" }]);
  });

  it("requires a mailing address only for a product that asks for one", async () => {
    const donation = defineCheckout({ ...product, requiresAddress: true });
    const refused = await pay({}, donation);
    expect(refused.status).toBe(400);
    expect(rows.orders).toEqual([]);
    Object.assign(rows.checkout_test_users[0], {
      addressLine1: "1 Main St",
      locality: "Nelson",
      regionCode: "BC",
      postalCode: "V1L 1A1",
      countryCode: "CA",
    });
    expect((await pay({}, donation)).status).toBe(200);
    expect(rows.orders[0].customerSnapshot).toMatchObject({
      addressLine1: "1 Main St",
      postalCode: "V1L 1A1",
    });
  });

  it("refuses a customer without a name", async () => {
    rows.checkout_test_users[0].familyName = "";
    expect((await pay()).status).toBe(400);
    expect(rows.orders).toEqual([]);
  });
});

describe("drop", () => {
  it("reports an id that never reached Pay as dropped", async () => {
    expect((await call(checkout.drop, { id })).body).toMatchObject({
      outcome: "dropped",
    });
    expect(reconcileOrder).not.toHaveBeenCalled();
  });

  it.each<[string, Status, typeof abandon, string]>([
    [
      "failed then cancelled",
      "failed",
      (order, attempts) => {
        order.status = "canceled";
        attempts[0].status = "canceled";
      },
      "dropped",
    ],
    [
      "pending the provider may have accepted",
      "pending",
      () => {},
      "unresolved",
    ],
    ["processing", "processing", () => {}, "unresolved"],
    [
      "requires action although the order was cancelled",
      "requires_action",
      (order) => (order.status = "canceled"),
      "unresolved",
    ],
    [
      "succeeded while abandoning",
      "requires_action",
      (_order, attempts) => (attempts[0].status = "succeeded"),
      "paid",
    ],
    [
      "failed while the order is still active",
      "failed",
      () => {},
      "unresolved",
    ],
  ])("%s", async (_name, status, effect, outcome) => {
    confirmStatus = status;
    await pay();
    abandon = effect;
    const { body } = await call(checkout.drop, { id });
    expect(body.outcome).toBe(outcome);
    expect(body.returnPath).toBe(
      outcome === "dropped" ? undefined : product.returnPath,
    );
  });

  it("never reports dropped when reconciliation throws", async () => {
    confirmStatus = "failed";
    await pay();
    abandon = () => {
      throw new Error("Provider unavailable");
    };
    const response = await call(checkout.drop, { id });
    expect(response.status).toBe(500);
    expect(response.body.outcome).toBeUndefined();
  });
});

describe("session and status", () => {
  it("shows a live order's saved lines and payment after the catalogue changes", async () => {
    confirmStatus = "requires_action";
    await pay();
    catalogue.lines[0] = { ...screening, unitCents: 30_000 };
    const { body } = await call(checkout.session, {
      id,
      choices: { guests: 5 },
    });
    expect(body.retired).toBe(false);
    expect(body.payment.paymentStatus).toBe("requires_action");
    expect(body.quote).toMatchObject({
      totalCents: 22_500,
      dueNowCents: 22_500,
      lines: [{ kind: "private_screening", unitCents: 22_500 }],
    });
    expect(Object.keys(body.quote.lines[0]).sort()).toEqual([
      "description",
      "kind",
      "quantity",
      "taxes",
      "totalCents",
      "unitCents",
    ]);
  });

  it("retires an order cancelled while the session was reconciling it", async () => {
    confirmStatus = "failed";
    await pay();
    catalogue.lines[0] = { ...screening, unitCents: 30_000 };
    const reconcile = reconcileOrder.getMockImplementation()!;
    reconcileOrder.mockImplementationOnce(async (orderId, options) => {
      rows.orders[0].status = "canceled";
      rows.transactions[0].status = "canceled";
      return reconcile(orderId, options);
    });
    const { body } = await call(checkout.session, {
      id,
      choices: { guests: 5 },
    });
    expect(body.retired).toBe(true);
    expect(body.payment).toBeUndefined();
    expect(body.quote.totalCents).toBe(30_000);
  });

  it("prices afresh for another user's flow id without revealing or reconciling that order", async () => {
    confirmStatus = "requires_action";
    await pay();
    catalogue.lines[0] = { ...screening, unitCents: 30_000 };
    mocks.user.id = 8;
    reconcileOrder.mockClear();
    const { body } = await call(checkout.session, {
      id,
      choices: { guests: 5 },
    });
    expect(body.retired).toBe(false);
    expect(body.payment).toBeUndefined();
    expect(body.quote.totalCents).toBe(30_000);
    expect(reconcileOrder).not.toHaveBeenCalled();
    expect(rows.orders).toMatchObject([{ userId: 7, status: "active" }]);
    expect(rows.transactions).toMatchObject([{ status: "requires_action" }]);
  });

  it("retires a cancelled order and prices afresh", async () => {
    confirmStatus = "failed";
    await pay();
    rows.orders[0].status = "canceled";
    rows.transactions[0].status = "canceled";
    catalogue.lines[0] = { ...screening, unitCents: 30_000 };
    const { body } = await call(checkout.session, {
      id,
      choices: { guests: 5 },
    });
    expect(body.retired).toBe(true);
    expect(body.payment).toBeUndefined();
    expect(body.quote.totalCents).toBe(30_000);
  });

  it("reports the payment with the saved order's quote", async () => {
    await pay();
    const { body } = await call(checkout.status, { sessionId: id });
    expect(body).toMatchObject({
      paymentStatus: "succeeded",
      quote: {
        lines: [{ kind: "private_screening", totalCents: 22_500 }],
        totalCents: 22_500,
        dueNowCents: 22_500,
        recurringCents: null,
        schedule: { type: "once" },
      },
    });
  });
});
