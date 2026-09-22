/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  search: new URLSearchParams("userId=1"),
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.search,
  usePathname: () => "/admin/orders",
}));

import OrdersList from "@kenstack/payments/orders/List";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let client: QueryClient;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  vi.useFakeTimers();
  mocks.search = new URLSearchParams("userId=1");
  window.history.replaceState(null, "", "/admin/orders?userId=1");
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.fetcher.mockImplementation(async (_path, body) =>
    body.action === "list-orders"
      ? {
          status: "success",
          orders: [],
          total: 0,
          page: 1,
          pageSize: 25,
          customer: {
            id: 1,
            givenName: "Ann",
            familyName: "Lee",
            email: "ann@example.test",
          },
        }
      : {
          status: "success",
          customers:
            body.term === "Bob"
              ? [
                  {
                    id: 2,
                    givenName: "Bob",
                    familyName: "Jones",
                    email: "bob@example.test",
                  },
                ]
              : [],
        },
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("uses only the new remote matches for keyboard selection and shows an empty result", async () => {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <OrdersList currentUserId={7} />
      </QueryClientProvider>,
    ),
  );
  await act(async () => vi.advanceTimersByTimeAsync(1));
  const input = container.querySelector<HTMLInputElement>("#orders-customer")!;
  expect(input.value).toContain("Ann");
  act(() => input.focus());
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "Bob");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
  });
  await act(async () => vi.advanceTimersByTimeAsync(350));
  expect(
    [...document.querySelectorAll('[role="option"]')].map(
      (option) => option.textContent,
    ),
  ).toEqual(["Bob Jones · bob@example.test"]);
  act(() =>
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    ),
  );
  expect(new URLSearchParams(window.location.search).get("userId")).toBe("2");
  act(() => input.focus());
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "No match");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(350);
  });
  await act(async () => vi.advanceTimersByTimeAsync(350));
  expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
  expect(document.body.textContent).toContain("No customers found.");
});

it("keeps the chosen calendar date in the URL and request without a timezone shift", async () => {
  mocks.search = new URLSearchParams("createdAt.from=2026-09-01");
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <OrdersList currentUserId={7} />
      </QueryClientProvider>,
    ),
  );
  act(() =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Filters"]')!
      .click(),
  );
  const input = document.querySelector<HTMLInputElement>(
    '[aria-label="Created (UTC) from"]',
  )!;
  expect(input.value).toBe("September 1, 2026");
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "September 14, 2026");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(input.value).toBe("September 14, 2026");
  expect(
    new URLSearchParams(window.location.search).get("createdAt.from"),
  ).toBe("2026-09-14");
  expect(mocks.fetcher).toHaveBeenCalledWith(
    "/api/payments",
    expect.objectContaining({
      action: "list-orders",
      search: expect.objectContaining({ "createdAt.from": "2026-09-14" }),
    }),
    expect.anything(),
  );
});

it("reveals cancelled unpaid orders from the filter control and keeps that choice in the URL", async () => {
  mocks.search = new URLSearchParams();
  window.history.replaceState(null, "", "/admin/orders");
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <OrdersList currentUserId={7} />
      </QueryClientProvider>,
    ),
  );
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(window.location.search).toBe("");
  act(() =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Filters"]')!
      .click(),
  );
  const addFilter = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === "Cancelled, unpaid",
  )!;
  await act(async () => {
    addFilter.click();
    await vi.advanceTimersByTimeAsync(350);
  });
  expect(
    new URLSearchParams(window.location.search).get("showCancelledUnpaid"),
  ).toBe("true");
  expect(mocks.fetcher).toHaveBeenCalledWith(
    "/api/payments",
    expect.objectContaining({
      action: "list-orders",
      search: expect.objectContaining({ showCancelledUnpaid: "true" }),
    }),
    expect.anything(),
  );
});

it.each([
  {
    refundStatus: "refunded",
    collectedCents: 0,
    paidCents: 23700,
    struck: "$237",
    monthlyCents: null,
    paymentCount: 1,
    label: "Refunded",
    left: "",
    right: "Originally paid $237Net collected $0",
  },
  {
    refundStatus: "partially_refunded",
    collectedCents: 13700,
    paidCents: 23700,
    struck: "$237",
    monthlyCents: null,
    paymentCount: 1,
    label: "Partially refunded",
    left: "",
    right: "Originally paid $237Net collected $137",
  },
  {
    refundStatus: "partially_refunded",
    collectedCents: 5337,
    paidCents: 8337,
    struck: "$83.37",
    monthlyCents: null,
    paymentCount: 3,
    label: "Partially refunded",
    left: "Originally paid $83.37Net collected $53.37",
    right: "$237",
  },
  {
    refundStatus: "none",
    collectedCents: 23700,
    paidCents: 23700,
    struck: undefined,
    monthlyCents: null,
    paymentCount: 1,
    label: "Succeeded",
    left: "",
    right: "$237",
  },
  {
    refundStatus: "refunded",
    collectedCents: 0,
    paidCents: 23700,
    struck: "$237",
    monthlyCents: 1000,
    paymentCount: null,
    label: "Refunded",
    left: "Originally paid $237Net collected $0",
    right: "$10monthly",
  },
])(
  "shows $label with the net amount and original price",
  async ({
    refundStatus,
    collectedCents,
    paidCents,
    struck,
    monthlyCents,
    paymentCount,
    label,
    left,
    right,
  }) => {
    mocks.fetcher.mockResolvedValue({
      status: "success",
      total: 1,
      page: 1,
      pageSize: 25,
      customer: null,
      orders: [
        {
          id: 10241,
          userId: 1,
          status: "active",
          channel: "website",
          currency: "cad",
          customerSnapshot: {
            givenName: "Ann",
            familyName: "Lee",
            email: "ann@example.test",
          },
          createdAt: "2026-09-18T18:00:00Z",
          latestPaymentStatus: "succeeded",
          committedCents: monthlyCents === null ? 23700 : null,
          collectedCents,
          paidCents,
          refundStatus,
          monthlyCents,
          paymentCount,
        },
      ],
    });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <OrdersList currentUserId={7} />
        </QueryClientProvider>,
      ),
    );
    await act(async () => vi.advanceTimersByTimeAsync(1));
    const cells = [
      ...container.querySelectorAll("tbody tr:first-child td"),
    ].map((cell) => cell.textContent);
    expect(cells.slice(2)).toEqual([label, left, right]);
    expect(container.querySelector("tbody s")?.textContent).toBe(struck);
  },
);

it("keeps the current table while another page loads, but clears it on an admin identity change", async () => {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <OrdersList currentUserId={7} />
      </QueryClientProvider>,
    ),
  );
  await act(async () => vi.advanceTimersByTimeAsync(1));
  const table = container.querySelector("table");
  expect(table).not.toBeNull();
  mocks.fetcher.mockReturnValue(new Promise(() => {}));
  mocks.search = new URLSearchParams("userId=1&page=2");
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <OrdersList currentUserId={7} />
      </QueryClientProvider>,
    ),
  );
  expect(container.querySelector("table")).toBe(table);
  expect(table?.parentElement?.getAttribute("aria-busy")).toBe("true");
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <OrdersList currentUserId={8} />
      </QueryClientProvider>,
    ),
  );
  expect(container.querySelector("table")).toBeNull();
});
