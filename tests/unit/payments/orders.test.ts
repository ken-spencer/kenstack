import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: vi.fn(), query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", async () => ({
  db: (await import("drizzle-orm/pg-proxy")).drizzle(mocks.query),
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getFreshCurrentUser: mocks.user,
}));
vi.mock("@kenstack/auth/server/auth", () => ({}));
vi.mock("@kenstack/lib/errorReporter", () => ({ reportError: vi.fn() }));

import { paymentsPost } from "@kenstack/payments/api";
import { loadOrder } from "@kenstack/payments/orders/queries";
import {
  orderListSchema,
  orderSearchParams,
} from "@kenstack/payments/orders/query";
import { searchParamsToRecord } from "@kenstack/list/querySchema";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 7, roles: ["admin"] });
  mocks.query.mockImplementation(async (query: string) => ({
    rows: query.startsWith("select count(*)") ? [[0]] : [],
  }));
});

function request(body: Record<string, unknown>) {
  return paymentsPost(
    new NextRequest("https://example.test/api/payments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

// Financial history and customer lookup must use fresh admin authorization,
// including when the visitor has a previously authenticated browser session.
it.each([
  [undefined, 401],
  [{ id: 7, roles: ["member"] }, 403],
])(
  "denies both actions and detail access before querying records",
  async (user, status) => {
    mocks.user.mockResolvedValue(user);
    for (const body of [
      { action: "list-orders", search: {} },
      { action: "search-order-customers", term: "an" },
    ]) {
      const response = await request(body);
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({ status: "error" });
    }
    await expect(loadOrder(10001)).rejects.toMatchObject({ status });
    expect(mocks.query).not.toHaveBeenCalled();
  },
);

it("does not load the directory for an empty or one-character customer search", async () => {
  for (const term of ["", " a "]) {
    const response = await request({ action: "search-order-customers", term });
    expect(await response.json()).toMatchObject({
      status: "success",
      customers: [],
    });
  }
  expect(mocks.query).not.toHaveBeenCalled();
});

it("bounds customer search, searches names and email, and treats wildcard characters literally", async () => {
  mocks.query.mockResolvedValue({
    rows: [[42, "Ann", "Lee", "ann@example.test"]],
  });
  const response = await request({
    action: "search-order-customers",
    term: "an_%",
  });
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({
    customers: [
      {
        id: 42,
        givenName: "Ann",
        familyName: "Lee",
        email: "ann@example.test",
      },
    ],
  });
  const [query, parameters] = mocks.query.mock.calls[0];
  expect(query).toContain('"users"."deleted_at" is null');
  expect(query).toContain('"users"."email" ilike');
  expect(query).toContain("concat_ws");
  expect(query).toContain("limit");
  expect(parameters).toEqual(["%an\\_\\%%", "%an\\_\\%%", 20]);
});

it("keeps customer, filters, sort and page in a shareable URL", () => {
  const query = orderListSchema.parse({
    search: {
      userId: "42",
      q: "Ann",
      status: "+active",
      paymentStatus: ["-failed"],
      sort: "-createdAt",
      page: "3",
      "createdAt.from": "2026-09-01",
      "createdAt.to": "2026-09-18",
    },
  });
  expect(query).toMatchObject({
    direction: "asc",
    page: 3,
    filters: {
      userId: "42",
      status: { active: "+" },
      paymentStatus: { failed: "-" },
    },
  });
  expect(
    orderListSchema.parse({
      search: searchParamsToRecord(orderSearchParams(query)),
    }),
  ).toEqual(query);
});

// Orders cancelled after a declined card never collected money and are hidden
// until staff ask for them; the link they share must carry that choice.
it("keeps the cancelled-unpaid filter out of the default link and round-trips it when staff turn it on", () => {
  const defaultQuery = orderListSchema.parse({ search: {} });
  expect(defaultQuery.filters).toEqual({});
  expect(orderSearchParams(defaultQuery).toString()).toBe("");
  const revealed = orderListSchema.parse({
    search: { showCancelledUnpaid: "true" },
  });
  expect(revealed.filters).toEqual({ showCancelledUnpaid: true });
  expect(orderSearchParams(revealed).toString()).toBe(
    "showCancelledUnpaid=true",
  );
  expect(
    orderListSchema.parse({
      search: searchParamsToRecord(orderSearchParams(revealed)),
    }),
  ).toEqual(revealed);
});

it("uses user identity and bounded stable pagination without multiplying orders by item or transaction rows", async () => {
  const response = await request({
    action: "list-orders",
    search: {
      userId: "42",
      page: "3",
      status: "+active",
      "createdAt.to": "2026-09-18",
    },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const [query, parameters] = mocks.query.mock.calls[0];
  expect(query).toContain('"orders"."user_id" =');
  expect(query).toContain(
    'order by "orders"."created_at" desc, "orders"."id" desc',
  );
  expect(query).toContain("interval '1 day'");
  expect(query).not.toMatch(/\bjoin\b/i);
  expect(parameters).toEqual(
    expect.arrayContaining([42, "2026-09-18", "active"]),
  );
  expect(parameters.slice(-2)).toEqual([25, 50]);
  expect(await response.json()).toMatchObject({
    status: "success",
    orders: [],
    page: 3,
    total: 0,
  });
});

it("rejects unknown actions and overlong customer searches", async () => {
  expect((await request({ action: "constructor" })).status).toBe(400);
  expect(
    (await request({ action: "search-order-customers", term: "x".repeat(201) }))
      .status,
  ).toBe(422);
  expect(mocks.query).not.toHaveBeenCalled();
});

it("correlates each financial summary with the outer order, not the inner row id", async () => {
  await request({ action: "list-orders", search: {} });
  const [query] = mocks.query.mock.calls[0];
  expect(query).toContain('"order_items"."order_id" = "orders"."id"');
  expect(query.match(/"transactions"\."order_id" = \S+/g)).toEqual(
    Array(5).fill('"transactions"."order_id" = "orders"."id"'),
  );
});

it("applies inclusive UTC calendar dates from the date filter", async () => {
  await request({
    action: "list-orders",
    search: {
      "createdAt.from": "2026-09-01",
      "createdAt.to": "2026-09-14",
    },
  });
  const [query, parameters] = mocks.query.mock.calls[0];
  expect(query).toContain("interval '1 day'");
  expect(parameters).toEqual(
    expect.arrayContaining(["2026-09-01", "2026-09-14"]),
  );
});

it("returns a missing order without fetching unrelated financial history", async () => {
  expect(await loadOrder(99999)).toBeNull();
  expect(mocks.query).toHaveBeenCalledTimes(1);
});

it("derives and filters incomplete attempts only when customer action is at least 24 hours old", async () => {
  await request({
    action: "list-orders",
    search: { paymentStatus: "+incomplete" },
  });
  for (const [query, parameters] of mocks.query.mock.calls) {
    expect(query.replace(/\s+/g, " ")).toContain(
      `case when "status" = 'requires_action' and "created_at" <= now() - interval '24 hours' then 'incomplete' else "status"::text end from "transactions"`,
    );
    expect(query).toContain('"transactions"."order_id" = "orders"."id"');
    expect(query).toContain('order by "transactions"."id" desc limit');
    expect(parameters).toContain("incomplete");
    expect(query).not.toMatch(/\b(update|insert|delete)\b/i);
  }
  expect(mocks.query).toHaveBeenCalledTimes(2);
});

it("derives refund state from successful payments and refunds, excluding dispute adjustments", async () => {
  await request({
    action: "list-orders",
    search: { refundStatus: "+refunded" },
  });
  expect(mocks.query).toHaveBeenCalledTimes(2);
  for (const [query, parameters] of mocks.query.mock.calls) {
    const normalized = query.replace(/\s+/g, " ");
    expect(normalized).toContain(
      `when coalesce(sum("total_cents") filter (where "kind" = 'refund'), 0) < 0`,
    );
    expect(normalized).toContain(
      `when sum("total_cents") filter (where "kind" in ('payment', 'refund')) <= 0 then 'refunded' else 'partially_refunded'`,
    );
    expect(normalized).toContain(
      `from "transactions" where ("transactions"."order_id" = "orders"."id" and "transactions"."status" =`,
    );
    expect(parameters).toContain("succeeded");
    expect(parameters).toContain("refunded");
  }
});

it("loads the same refund and stale-payment derivations for an order detail", async () => {
  await loadOrder(10241);
  const [query, parameters] = mocks.query.mock.calls[0];
  expect(query).toContain("interval '24 hours'");
  expect(query).toContain("then 'incomplete'");
  expect(query).toContain("then 'refunded'");
  expect(query).toContain("else 'partially_refunded'");
  expect(
    query.match(/"transactions"\."order_id" = "orders"\."id"/g),
  ).toHaveLength(2);
  expect(parameters).toEqual(
    expect.arrayContaining(["payment", "succeeded", 10241]),
  );
});
