import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadOrder: vi.fn() }));
vi.mock("@kenstack/payments/orders/queries", () => ({
  loadOrder: mocks.loadOrder,
}));
vi.mock("@kenstack/pageRoute", () => ({
  pageRoute:
    (
      _options: unknown,
      render: (context: {
        params: { id: number };
        searchIn: Record<string, string>;
      }) => Promise<ReactNode>,
    ) =>
    () =>
      render({ params: { id: 10001 }, searchIn: {} }),
}));

import Page from "@kenstack/payments/orders/DetailPage";

beforeEach(() => {
  mocks.loadOrder.mockReset();
});

// Saved tax allocations must reconcile to the order total without charging included tax twice.
it.each([
  {
    included: true,
    code: "GST",
    name: "Goods and Services Tax",
    label: "GST",
    totals: [22500, 1200],
    taxes: [1072, 57],
    subtotal: null,
    total: "$237.00",
    tax: "$11.29",
  },
  {
    included: false,
    code: "VAT",
    name: "Value added tax",
    label: "VAT",
    totals: [23625, 1260],
    taxes: [1125, 60],
    subtotal: "$237.00",
    total: "$248.85",
    tax: "$11.85",
  },
  {
    included: true,
    code: undefined,
    name: "Goods and Services Tax",
    label: "Goods and Services Tax",
    totals: [null, 1200],
    taxes: [1072, 57],
    subtotal: null,
    total: "Ongoing",
    tax: "$11.29",
  },
])(
  "summarizes saved tax with included=$included and total=$total",
  async ({
    included,
    code,
    name,
    label,
    totals,
    taxes,
    subtotal,
    total,
    tax,
  }) => {
    mocks.loadOrder.mockResolvedValue({
      order: {
        id: 10001,
        status: "active",
        latestPaymentStatus: "none",
        refundStatus: "none",
        currency: "cad",
        paymentCount: 1,
        monthlyCents: null,
        createdAt: new Date("2026-09-18T18:00:00Z"),
        channel: "website",
        customerSnapshot: {
          givenName: "Ann",
          familyName: "Lee",
          email: "ann@example.test",
        },
      },
      items: [22500, 1200].map((unitCents, index) => ({
        id: index + 1,
        description: index === 0 ? "Screening" : "Combo",
        quantity: 1,
        unitCents,
        totalCents: totals[index],
        discounts: [],
        taxes: [
          {
            id: "gst",
            code,
            name,
            rate: 5,
            isIncluded: included,
            amountCents: taxes[index],
          },
        ],
      })),
      transactions: [],
    });
    const html = renderToStaticMarkup(await Page({}));
    const summary = html.slice(html.indexOf("<dl"), html.indexOf("</dl>") + 5);
    expect(summary).toContain(
      included ? `Includes ${label}` : `>${label}</dt>`,
    );
    expect(summary).toContain(tax);
    expect(summary).toContain(total);
    expect(summary.split(label)).toHaveLength(2);
    expect(
      html.slice(html.indexOf("<ul"), html.indexOf("</ul>") + 5),
    ).not.toContain(label);
    expect(summary.includes("Subtotal")).toBe(subtotal !== null);
    if (subtotal) expect(summary).toContain(subtotal);
  },
);

it.each([true, false])(
  "keeps Stripe methods in the popover and other methods on their rows: %s",
  async (sameMethod) => {
    mocks.loadOrder.mockResolvedValue({
      order: {
        id: 10001,
        status: "active",
        latestPaymentStatus: "none",
        refundStatus: "none",
        currency: "cad",
        paymentCount: 1,
        monthlyCents: null,
        createdAt: new Date("2026-09-18T18:00:00Z"),
        channel: "website",
        customerSnapshot: {
          givenName: "Ann",
          familyName: "Lee",
          email: "ann@example.test",
        },
      },
      items: [],
      transactions: ["credit", sameMethod ? "credit" : "cash"].map(
        (method, index) => ({
          id: index + 1,
          kind: "payment",
          method,
          stripeChargeId: method === "credit" ? `ch_test_${index}` : null,
          status: "succeeded",
          totalCents: 1000,
          feeCents: 0,
          createdAt: new Date("2026-09-18T18:00:00Z"),
          instalment: index + 1,
        }),
      ),
    });
    const html = renderToStaticMarkup(await Page({}));
    const table = html.slice(
      html.indexOf("<table"),
      html.indexOf("</table>") + 8,
    );
    expect(html).toContain(">Transactions</h2>");
    expect(table).not.toContain("Credit card");
    expect(table.match(/>Stripe</g)).toHaveLength(sameMethod ? 2 : 1);
    expect(table.includes("Cash")).toBe(!sameMethod);
    expect(table).toContain("Payment 1");
    expect(table).toContain("Payment 2");
  },
);

it.each([
  {
    status: "active",
    latestPaymentStatus: "succeeded",
    refundStatus: "refunded",
    label: "Refunded",
  },
  {
    status: "canceled",
    latestPaymentStatus: "succeeded",
    refundStatus: "partially_refunded",
    label: "Partially refunded",
  },
  {
    status: "canceled",
    latestPaymentStatus: "failed",
    refundStatus: "none",
    label: "Cancelled",
  },
  {
    status: "active",
    latestPaymentStatus: "incomplete",
    refundStatus: "none",
    label: "Incomplete",
  },
  {
    status: "active",
    latestPaymentStatus: "succeeded",
    refundStatus: "none",
    label: "Succeeded",
  },
  {
    status: "active",
    latestPaymentStatus: "none",
    refundStatus: "none",
    label: "No payment attempt",
  },
])(
  "shows $label in the order header",
  async ({ status, latestPaymentStatus, refundStatus, label }) => {
    mocks.loadOrder.mockResolvedValue({
      order: {
        id: 10001,
        status,
        latestPaymentStatus,
        refundStatus,
        currency: "cad",
        paymentCount: 1,
        createdAt: new Date("2026-09-18T18:00:00Z"),
        channel: "website",
        customerSnapshot: {
          givenName: "Ann",
          familyName: "Lee",
          email: "ann@example.test",
        },
      },
      items: [],
      transactions: [],
    });
    const html = renderToStaticMarkup(await Page({}));
    const header = html.slice(html.indexOf("<h1"), html.indexOf("<section"));
    expect(header).toContain(`>${label}</span>`);
    expect(header).not.toContain(">Active</span>");
  },
);
