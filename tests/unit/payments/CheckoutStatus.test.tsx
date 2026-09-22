/** @vitest-environment jsdom */

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as z from "zod";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  user: { state: "authenticated", userId: 7 },
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("@kenstack/auth/useUserInfo", () => ({
  useUserInfo: () => mocks.user,
}));

import { useStoredValue } from "@kenstack/hooks/storedState";
import CheckoutStatus from "@kenstack/payments/checkout/Status";
import type { CheckoutStatusResult } from "@kenstack/payments/checkout/server";
import { storedSchema } from "@kenstack/payments/checkout/stored";

const sessionId = "checkoutflow001";
const giftSchema = z.string();

function buildStatus(
  paymentStatus: CheckoutStatusResult["paymentStatus"],
  paymentCount: number | null = 1,
) {
  return {
    status: "success" as const,
    id: 1,
    sessionId,
    transactionId: 22,
    paymentStatus,
    amountCents: paymentCount === 12 ? 8_337 : 100_000,
    paymentCount,
    livemode: false,
    items: [{ kind: "sponsorship", description: "Seat A1" }],
    clientSecret: null,
    currency: "cad",
    quote: {
      lines: [
        {
          kind: "sponsorship",
          description: "Seat A1",
          quantity: 1,
          unitCents: 100_000,
          totalCents: 100_000,
          taxes: [],
        },
      ],
      totalCents: 100_000,
      dueNowCents: paymentCount === 12 ? 8_337 : 100_000,
      recurringCents: paymentCount === 12 ? 8_333 : null,
      schedule:
        paymentCount === 12
          ? { type: "instalments" as const, count: 12 }
          : { type: "once" as const },
      fingerprint: "a".repeat(64),
    },
  } satisfies CheckoutStatusResult & { status: "success" };
}

// Stands in for the flow whose stored state the completion page clears.
function StoredGift({
  checkoutId = sessionId,
  userId = 7,
}: {
  checkoutId?: string;
  userId?: number;
}) {
  const [gift, setGift] = useStoredValue("/donate", "gift", giftSchema);
  const [, setCheckout] = useStoredValue(
    "/donate",
    `checkout:${userId}`,
    storedSchema,
  );
  return (
    <button
      onClick={() => {
        setGift("saved gift");
        setCheckout({ id: checkoutId, choicesKey: "{}" });
      }}
    >
      {gift ?? "empty"}
    </button>
  );
}

let container: HTMLDivElement;
let root: Root;

// React Query delivers a result on a timer of its own after the request resolves.
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
}

async function render(
  props: Partial<ComponentProps<typeof CheckoutStatus>> = {},
  draft: ComponentProps<typeof StoredGift> = {},
) {
  await act(async () =>
    root.render(
      <>
        <StoredGift {...draft} />
        <CheckoutStatus
          apiPath="/api/checkout-test"
          checkoutHref="/donate"
          sessionId={sessionId}
          storeId="/donate"
          {...props}
        />
      </>,
    ),
  );
  await settle();
}

function announcement() {
  return container.querySelector('[role="status"]')!.textContent;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.clear();
  vi.clearAllMocks();
  mocks.user = { state: "authenticated", userId: 7 };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("shows the host's thank-you, the order and its schedule, and clears the flow once paid", async () => {
  mocks.fetcher.mockResolvedValue(buildStatus("succeeded", 12));
  await act(async () => root.render(<StoredGift />));
  await act(async () => container.querySelector("button")!.click());
  expect(container.textContent).toContain("saved gift");

  await render({ children: <h1>Thank you for your gift</h1> });

  expect(mocks.fetcher).toHaveBeenCalledWith(
    "/api/checkout-test",
    { action: "status", sessionId },
    { signal: expect.any(AbortSignal) },
  );
  expect(container.querySelector("h1")!.textContent).toBe(
    "Thank you for your gift",
  );
  expect(container.querySelectorAll("h1")).toHaveLength(1);
  expect(container.querySelector(".lines")!.textContent).toBe(
    "Seat A1$1,000.00",
  );
  // The amount just charged reads before the payments that follow it.
  expect(container.querySelector(".summary")!.textContent).toContain(
    "Amount paid$83.37then 11 monthly payments of $83.33 ($1,000.00 in total)",
  );
  expect(container.querySelector("button")!.textContent).toBe("empty");
});

it("keeps a newer checkout when an older paid confirmation is opened", async () => {
  mocks.fetcher.mockResolvedValue(buildStatus("succeeded"));
  await act(async () =>
    root.render(<StoredGift checkoutId="checkoutflow002" />),
  );
  await act(async () => container.querySelector("button")!.click());
  const stored = { ...localStorage };

  await render();

  expect(container.querySelector("h1")!.textContent).toBe("Payment complete");
  expect({ ...localStorage }).toEqual(stored);
  expect(container.querySelector("button")!.textContent).toBe("saved gift");
});

it("checks the latest saved checkout after the status request completes", async () => {
  const response = Promise.withResolvers<ReturnType<typeof buildStatus>>();
  mocks.fetcher.mockReturnValue(response.promise);
  await act(async () => root.render(<StoredGift />));
  await act(async () => container.querySelector("button")!.click());
  await render({}, { checkoutId: "checkoutflow002" });

  await act(async () => container.querySelector("button")!.click());
  const stored = { ...localStorage };
  await act(async () => response.resolve(buildStatus("succeeded")));
  await settle();

  expect(mocks.fetcher).toHaveBeenCalledOnce();
  expect(container.querySelector("h1")!.textContent).toBe("Payment complete");
  expect({ ...localStorage }).toEqual(stored);
});

it("does not clear another account's draft when an earlier status request finishes", async () => {
  const response = Promise.withResolvers<ReturnType<typeof buildStatus>>();
  mocks.fetcher.mockReturnValueOnce(response.promise).mockResolvedValue({
    status: "error",
    message: "Payment not found.",
  });
  await act(async () => root.render(<StoredGift />));
  await act(async () => container.querySelector("button")!.click());
  await render();

  mocks.user = { state: "authenticated", userId: 8 };
  await render({}, { checkoutId: "checkoutflow002", userId: 8 });
  await act(async () => container.querySelector("button")!.click());
  const stored = { ...localStorage };
  expect(mocks.fetcher.mock.calls[0][2].signal.aborted).toBe(true);
  await act(async () => response.resolve(buildStatus("succeeded")));
  await settle();

  expect({ ...localStorage }).toEqual(stored);
  expect(container.querySelector('[role="alert"]')!.textContent).toBe(
    "Payment not found.",
  );
});

it.each([
  "pending",
  "processing",
  "requires_action",
  "failed",
  "canceled",
] as const)(
  "keeps the matching checkout while payment is %s",
  async (status) => {
    mocks.fetcher.mockResolvedValue(buildStatus(status));
    await act(async () => root.render(<StoredGift />));
    await act(async () => container.querySelector("button")!.click());
    const stored = { ...localStorage };

    await render();

    expect({ ...localStorage }).toEqual(stored);
  },
);

it("uses its own heading when the host supplies none", async () => {
  mocks.fetcher.mockResolvedValue(buildStatus("succeeded"));
  await render();
  expect(container.querySelector("h1")!.textContent).toBe("Payment complete");
  expect(container.querySelector(".schedule")).toBeNull();
});

it("polls a processing payment and announces the result once", async () => {
  mocks.fetcher.mockResolvedValue(buildStatus("processing"));
  await act(async () => root.render(<StoredGift />));
  await act(async () => container.querySelector("button")!.click());
  await render();
  expect(container.querySelector("button")!.textContent).toBe("saved gift");
  expect(container.querySelector("h1")!.textContent).toBe(
    "Payment is not confirmed",
  );
  expect(announcement()).toBe("Payment is not confirmed");
  const announced: (string | null)[] = [];
  const observer = new MutationObserver(() => announced.push(announcement()));
  observer.observe(container.querySelector('[role="status"]')!, {
    characterData: true,
    childList: true,
    subtree: true,
  });

  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(mocks.fetcher).toHaveBeenCalledTimes(2);
  mocks.fetcher.mockResolvedValue(buildStatus("succeeded"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  await settle();
  observer.disconnect();

  expect(mocks.fetcher).toHaveBeenCalledTimes(3);
  expect(container.querySelector("h1")!.textContent).toBe("Payment complete");
  expect(container.querySelector("button")!.textContent).toBe("empty");
  expect(announced).toEqual(["Payment complete"]);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(5000);
  });
  expect(mocks.fetcher).toHaveBeenCalledTimes(3);
});

it("sends a payment that did not complete back to checkout", async () => {
  mocks.fetcher.mockResolvedValue(buildStatus("failed"));
  await act(async () => root.render(<StoredGift />));
  await act(async () => container.querySelector("button")!.click());
  await render();

  expect(container.querySelector("h1")!.textContent).toBe(
    "Payment did not complete",
  );
  const link = container.querySelector("a")!;
  expect(link.textContent).toBe("Return to checkout");
  expect(link.getAttribute("href")).toBe("/donate");
  expect(container.textContent).not.toContain("Check again");
  expect(container.textContent).toContain("Due today$1,000.00");
  expect(container.textContent).not.toContain("Amount paid");
  // Only a paid order ends the flow.
  expect(container.querySelector("button")!.textContent).toBe("saved gift");
});

it.each(["Payment not found.", "Sign in to continue."])(
  "reports an unavailable payment with a retry and a sign-in link: %s",
  async (message) => {
    mocks.fetcher.mockResolvedValue({ status: "error", message });
    await act(async () => root.render(<StoredGift />));
    await act(async () => container.querySelector("button")!.click());
    const stored = { ...localStorage };
    await render();

    expect({ ...localStorage }).toEqual(stored);
    expect(container.querySelector('[role="alert"]')!.textContent).toBe(
      message,
    );
    const link = container.querySelector("a")!;
    expect(link.textContent).toBe("Sign in");
    expect(link.getAttribute("href")).toBe("/login");

    mocks.fetcher.mockResolvedValue(buildStatus("succeeded"));
    const retry = Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent === "Try again",
    );
    await act(async () => retry!.click());
    await settle();
    expect(container.querySelector("h1")!.textContent).toBe("Payment complete");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  },
);

it("offers another check while the bank still has to verify", async () => {
  mocks.fetcher.mockResolvedValue(buildStatus("requires_action"));
  await render();

  expect(container.querySelector("h1")!.textContent).toBe(
    "Payment is not confirmed",
  );
  expect(container.querySelector("a")!.textContent).toBe("Return to checkout");
  const check = Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent === "Check again",
  );
  await act(async () => check!.click());
  await settle();
  expect(mocks.fetcher).toHaveBeenCalledTimes(2);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(mocks.fetcher).toHaveBeenCalledTimes(2);
});
