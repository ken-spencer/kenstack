/** @vitest-environment jsdom */

import { act, type ComponentProps, type PropsWithChildren } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaymentElement } from "@stripe/react-stripe-js";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  replace: vi.fn(),
  handleNextAction: vi.fn(),
  user: { state: "authenticated", userId: 7 } as
    { state: "authenticated"; userId: number } | { state: "anonymous" },
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("@kenstack/auth/useUserInfo", () => ({
  useUserInfo: () => mocks.user,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: () => Promise.resolve(null),
}));
vi.mock("@stripe/react-stripe-js", () => {
  const stripe = {
    createConfirmationToken: async () => ({
      confirmationToken: { id: "ctoken_test" },
    }),
    handleNextAction: mocks.handleNextAction,
  };
  const elements = { submit: async () => ({}), update: () => {} };
  return {
    Elements: ({ children }: PropsWithChildren) => children,
    ExpressCheckoutElement: () => null,
    PaymentElement: vi.fn(() => <div>Stripe card form</div>),
    useStripe: () => stripe,
    useElements: () => elements,
  };
});

import { ReturnedError } from "@kenstack/api/errors";
import DefaultActions from "@kenstack/components/StepFlow/Actions";
import StepFlowClient from "@kenstack/components/StepFlow/Client";
import StepHeading from "@kenstack/components/StepFlow/Heading";
import Checkout from "@kenstack/payments/checkout/Checkout";
import type {
  CheckoutPayResult,
  CheckoutSessionResult,
} from "@kenstack/payments/checkout/server";

const apiPath = "/api/checkout-test";
const changedMessage =
  "Your order changed on our side. Review the updated summary before paying.";

function buildSession(
  overrides: Partial<CheckoutSessionResult> & { description?: string } = {},
) {
  const { description = "Donation", ...rest } = overrides;
  return {
    status: "success" as const,
    publishableKey: "pk_test_fixture",
    customerSessionClientSecret: "cuss_secret_fixture",
    currency: "cad",
    returnPath: "/donate/complete",
    retired: false,
    quote: {
      lines: [
        {
          kind: "donation",
          description,
          quantity: 2,
          unitCents: 2500,
          totalCents: 5250,
          taxes: [
            {
              id: "gst",
              code: "GST",
              name: "GST",
              rate: 5,
              isIncluded: false,
              amountCents: 250,
            },
          ],
        },
      ],
      totalCents: 5250,
      dueNowCents: 5250,
      recurringCents: null,
      schedule: { type: "once" as const },
      fingerprint: (description === "Donation" ? "a" : "b").repeat(64),
    },
    ...rest,
  } satisfies CheckoutSessionResult & { status: "success" };
}

function buildPayment(
  sessionId: string,
  paymentStatus: CheckoutPayResult["paymentStatus"],
  transactionId = 22,
) {
  return {
    id: 1,
    sessionId,
    transactionId,
    paymentStatus,
    amountCents: 5250,
    paymentCount: 1,
    livemode: false,
    items: [{ kind: "donation", description: "Donation" }],
    clientSecret: paymentStatus === "requires_action" ? "pi_secret" : null,
  } satisfies CheckoutPayResult;
}

// The fake endpoint: each test replaces the answers it cares about.
const server = {
  session: vi.fn(),
  pay: vi.fn(),
  drop: vi.fn(),
};

function requests(action: keyof typeof server) {
  return mocks.fetcher.mock.calls
    .filter(([path, body]) => path === apiPath && body.action === action)
    .map(([, body]) => body);
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

let container: HTMLDivElement;
let root: Root;

function Flow(
  props: Omit<ComponentProps<typeof Checkout>, "apiPath" | "choices"> & {
    choices?: Record<string, unknown>;
  },
) {
  return (
    <StepFlowClient
      Actions={DefaultActions}
      Header={StepHeading}
      basePath="/flow"
      id="steps"
      steps={{
        pay: {
          content: (
            <Checkout apiPath={apiPath} choices={{ amount: 25 }} {...props} />
          ),
          title: "Payment",
        },
      }}
    />
  );
}

async function until(assertion: () => void) {
  for (let attempt = 0; ; attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    try {
      assertion();
      return;
    } catch (error) {
      if (attempt === 50) throw error;
    }
  }
}

async function render(props: ComponentProps<typeof Flow> = {}) {
  await act(async () => root.render(<Flow {...props} />));
}

async function renderReady(props: ComponentProps<typeof Flow> = {}) {
  await render(props);
  await until(() => expect(container.textContent).toContain("Pay now"));
}

async function pay() {
  const button = Array.from(container.querySelectorAll("button")).find(
    (node) => node.textContent === "Pay now",
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

function alerts() {
  return Array.from(container.querySelectorAll('[role="alert"]')).map(
    (node) => node.textContent,
  );
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  // jsdom has no layout; the form's status outlet scrolls itself into view.
  Element.prototype.scrollIntoView = () => {};
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.clear();
  vi.clearAllMocks();
  mocks.user = { state: "authenticated", userId: 7 };
  mocks.fetcher.mockImplementation(
    async (_path: string, body: { action: keyof typeof server }) =>
      server[body.action](body),
  );
  server.session.mockReset().mockImplementation(async () => buildSession());
  server.pay.mockReset().mockImplementation(async ({ id }: { id: string }) => ({
    status: "success",
    ...buildPayment(id, "failed"),
  }));
  server.drop.mockReset().mockImplementation(async () => ({
    status: "success",
    outcome: "dropped",
  }));
  mocks.handleNextAction.mockReset().mockResolvedValue({});
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("Checkout", () => {
  it("shows the server's quote under an id stored when the step opens", async () => {
    await renderReady({ children: <p>Film: Casablanca</p> });

    expect(requests("session")).toEqual([
      {
        action: "session",
        id: expect.stringMatching(/^.{15}$/),
        choices: { amount: 25 },
      },
    ]);
    expect(JSON.stringify({ ...localStorage })).toContain(
      requests("session")[0].id,
    );
    const summary = container.querySelector(".summary")!;
    expect(summary.textContent).toContain("Donation");
    expect(summary.textContent).toContain("× 2");
    expect(summary.textContent).toContain("$50.00");
    expect(summary.textContent).toContain("GST (5%)");
    expect(summary.textContent).toContain("$2.50");
    expect(summary.querySelector(".total")!.textContent).toBe(
      "Due today$52.50",
    );
    // The slot reads between the priced rows and the amount due.
    expect(summary.textContent).toContain(
      "GST (5%)$2.50Film: CasablancaDue today$52.50",
    );
    expect(container.textContent).toContain("Stripe card form");
  });

  it("pays one order from two tabs and keeps its id through a reload", async () => {
    await renderReady();
    const otherContainer = document.createElement("div");
    document.body.append(otherContainer);
    const otherTab = createRoot(otherContainer);
    await act(async () => otherTab.render(<Flow />));
    await until(() => expect(otherContainer.textContent).toContain("Pay now"));

    const [{ id }, other] = requests("session");
    expect(other.id).toBe(id);
    expect(requests("drop")).toEqual([]);

    await pay();
    const otherPay = Array.from(otherContainer.querySelectorAll("button")).find(
      (node) => node.textContent === "Pay now",
    );
    await act(async () => otherPay!.click());
    await until(() => expect(requests("pay")).toHaveLength(2));
    expect(requests("pay").map((request) => request.id)).toEqual([id, id]);
    await act(async () => otherTab.unmount());
    otherContainer.remove();

    await act(async () => root.unmount());
    root = createRoot(container);
    await renderReady();
    expect(requests("session").at(-1)).toMatchObject({ id });
  });

  it("describes an instalment plan and a monthly plan under the list", async () => {
    server.session.mockImplementation(async () => {
      const session = buildSession();
      return {
        ...session,
        quote: {
          ...session.quote,
          lines: [
            {
              ...session.quote.lines[0],
              quantity: 1,
              unitCents: 100_000,
              totalCents: 100_000,
              taxes: [{ ...session.quote.lines[0].taxes[0], isIncluded: true }],
            },
          ],
          totalCents: 100_000,
          dueNowCents: 8_337,
          recurringCents: 8_333,
          schedule: { type: "instalments" as const, count: 12 },
        },
      };
    });
    await renderReady();

    const summary = container.querySelector(".summary")!;
    expect(summary.querySelector(".taxes .included")!.textContent).toContain(
      "Includes GST",
    );
    // The amount charged today reads first, then what follows it.
    expect(summary.textContent).toContain(
      "Due today$83.37then 11 monthly payments of $83.33 ($1,000.00 in total)",
    );
  });

  it("pays under the stored id and leaves for the return path on success", async () => {
    const accepted = createDeferred<unknown>();
    server.pay.mockImplementation(() => accepted.promise);
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));

    const [request] = requests("pay");
    expect(request).toEqual({
      action: "pay",
      id: expect.stringMatching(/^[0-9a-z]{15}$/),
      choices: { amount: 25 },
      fingerprint: "a".repeat(64),
      confirmationTokenId: "ctoken_test",
      previousTransactionId: undefined,
    });

    await act(async () =>
      accepted.resolve({
        status: "success",
        ...buildPayment(request.id, "succeeded"),
      }),
    );
    await until(() =>
      expect(mocks.replace).toHaveBeenCalledWith(
        `/donate/complete?session_id=${request.id}`,
      ),
    );
    expect(container.textContent).toContain("Checking payment…");
  });

  it("reports a decline in the form and retries the same order", async () => {
    await renderReady();
    await pay();
    await until(() =>
      expect(alerts()).toEqual([
        "This payment did not complete. Check your payment details and try again.",
      ]),
    );

    await pay();
    await until(() => expect(requests("pay")).toHaveLength(2));
    const [first, second] = requests("pay");
    expect(second.id).toBe(first.id);
    expect(first.previousTransactionId).toBeUndefined();
    expect(second.previousTransactionId).toBe(22);
  });

  it("confirms a pending attempt left by an interrupted Pay after a reload", async () => {
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    await act(async () => root.unmount());
    root = createRoot(container);
    server.session.mockImplementation(async () =>
      buildSession({ payment: buildPayment(id, "pending") }),
    );
    await renderReady();

    await pay();
    await until(() => expect(requests("pay")).toHaveLength(2));
    expect(requests("pay")[1]).toMatchObject({
      id,
      previousTransactionId: undefined,
    });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("recovers the declined order after a reload", async () => {
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    await act(async () => root.unmount());
    root = createRoot(container);
    server.session.mockImplementation(async () =>
      buildSession({ payment: buildPayment(id, "failed") }),
    );
    await renderReady();
    expect(requests("session").at(-1)).toMatchObject({ id });

    await pay();
    await until(() => expect(requests("pay")).toHaveLength(2));
    expect(requests("pay")[1]).toMatchObject({
      id,
      previousTransactionId: 22,
    });
  });

  it("silently drops the order when the customer changes their choices", async () => {
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    await render({ choices: { amount: 50 } });
    await until(() => expect(requests("session")).toHaveLength(2));
    await until(() => expect(container.textContent).toContain("Pay now"));

    expect(requests("drop")).toEqual([{ action: "drop", id }]);
    const next = requests("session")[1];
    expect(next.choices).toEqual({ amount: 50 });
    expect(next.id).not.toBe(id);
    expect(alerts()).toEqual([]);

    await pay();
    await until(() => expect(requests("pay")).toHaveLength(2));
    expect(requests("pay")[1].id).toBe(next.id);
    expect(requests("pay")[1].previousTransactionId).toBeUndefined();
  });

  it.each(["paid", "unresolved"] as const)(
    "leaves for the status page when the dropped order is %s",
    async (outcome) => {
      await renderReady();
      await pay();
      await until(() => expect(requests("pay")).toHaveLength(1));
      const { id } = requests("pay")[0];
      server.drop.mockImplementation(async () => ({
        status: "success",
        outcome,
        payment: buildPayment(
          id,
          outcome === "paid" ? "succeeded" : "requires_action",
        ),
        returnPath: "/donate/complete",
      }));

      await render({ choices: { amount: 50 } });
      await until(() =>
        expect(mocks.replace).toHaveBeenCalledWith(
          `/donate/complete?session_id=${id}`,
        ),
      );
      expect(requests("session")).toHaveLength(1);
      expect(requests("pay")).toHaveLength(1);
      expect(container.textContent).not.toContain("Stripe card form");
      expect(container.textContent).toContain("Checking payment…");
    },
  );

  it("keeps the order when it cannot be dropped and offers another try", async () => {
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];
    server.drop.mockImplementation(async () => {
      throw new Error("Unable to reach the server.");
    });

    await render({ choices: { amount: 50 } });
    await until(() =>
      expect(alerts()).toEqual(["Unable to reach the server."]),
    );
    expect(requests("session")).toHaveLength(1);
    expect(JSON.stringify({ ...localStorage })).toContain(id);

    server.drop.mockImplementation(async () => ({
      status: "success",
      outcome: "dropped",
    }));
    const retry = Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent === "Try again",
    );
    await act(async () => retry!.click());
    await until(() => expect(container.textContent).toContain("Pay now"));
    expect(requests("drop")).toHaveLength(2);
  });

  it("refreshes the list in place with one notice when the order changed on our side", async () => {
    server.pay.mockImplementation(async () => ({
      status: "error",
      code: "checkout_lines_changed",
      message: changedMessage,
    }));
    await renderReady();
    const refreshed = createDeferred<unknown>();
    server.session.mockImplementation(() => refreshed.promise);
    await pay();
    await until(() => expect(requests("session")).toHaveLength(2));

    const { id } = requests("pay")[0];
    expect(requests("session")[1]).toMatchObject({ id });
    const summary = container.querySelector(".summary")!;
    expect(summary.getAttribute("aria-busy")).toBe("true");
    expect(summary.textContent).toContain("Donation");
    expect(container.textContent).toContain("Stripe card form");

    await act(async () =>
      refreshed.resolve(buildSession({ description: "Donation with new tax" })),
    );
    await until(() =>
      expect(summary.textContent).toContain("Donation with new tax"),
    );
    expect(summary.getAttribute("aria-busy")).toBe("false");
    expect(alerts()).toEqual([changedMessage]);
    expect(document.activeElement).toBe(
      container.querySelector('[role="alert"]'),
    );

    server.pay.mockImplementation(async (body: { id: string }) => ({
      status: "success",
      ...buildPayment(body.id, "failed"),
    }));
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(2));
    expect(requests("pay")[1]).toMatchObject({
      id,
      fingerprint: "b".repeat(64),
    });
    // The change notice gives way to the form's own outcome.
    await until(() =>
      expect(alerts()).toEqual([
        "This payment did not complete. Check your payment details and try again.",
      ]),
    );
  });

  it("takes a new id after the order expired on our side", async () => {
    const expiredMessage =
      "This payment was cancelled. Review the refreshed summary before paying again.";
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    server.pay.mockImplementation(async () => ({
      status: "error",
      code: "checkout_expired",
      message: expiredMessage,
    }));
    // The refresh still names the expired order, so the server can retire it or report it paid.
    server.session.mockImplementation(async (body: { id?: string }) =>
      buildSession({ retired: body.id === id }),
    );
    await pay();
    await until(() => expect(alerts()).toEqual([expiredMessage]));
    expect(requests("session").at(-1)).toMatchObject({ id });
    await until(() =>
      expect(JSON.stringify({ ...localStorage })).not.toContain(id),
    );

    server.pay.mockImplementation(async (body: { id: string }) => ({
      status: "success",
      ...buildPayment(body.id, "failed"),
    }));
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(3));
    expect(requests("pay")[2].id).not.toBe(id);
    expect(requests("pay")[2].previousTransactionId).toBeUndefined();
  });

  it("forgets a retired order and leaves browsing renewal on", async () => {
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    await act(async () => root.unmount());
    root = createRoot(container);
    const onPaymentStarted = vi.fn();
    server.session.mockImplementation(async () =>
      buildSession({ retired: true }),
    );
    await renderReady({ onPaymentStarted });

    expect(requests("session").at(-1)).toMatchObject({ id });
    expect(JSON.stringify({ ...localStorage })).not.toContain(id);
    expect(onPaymentStarted).toHaveBeenLastCalledWith(false);
    expect(onPaymentStarted).not.toHaveBeenCalledWith(true);
  });

  it.each(["succeeded", "processing"] as const)(
    "goes to the status page without paying when the saved payment is %s",
    async (paymentStatus) => {
      await renderReady();
      await pay();
      await until(() => expect(requests("pay")).toHaveLength(1));
      const { id } = requests("pay")[0];

      await act(async () => root.unmount());
      root = createRoot(container);
      server.session.mockImplementation(async () =>
        buildSession({ payment: buildPayment(id, paymentStatus) }),
      );
      await render();
      await until(() =>
        expect(mocks.replace).toHaveBeenCalledWith(
          `/donate/complete?session_id=${id}`,
        ),
      );
      expect(requests("pay")).toHaveLength(1);
      expect(container.textContent).not.toContain("Stripe card form");
    },
  );

  // A browser verification error is not evidence: only the server's outcome permits a charge.
  describe("after bank verification fails in the browser", () => {
    async function failVerification() {
      server.pay.mockImplementation(
        async (body: { id: string; previousTransactionId?: number }) => ({
          status: "success",
          ...buildPayment(
            body.id,
            body.previousTransactionId ? "succeeded" : "requires_action",
            body.previousTransactionId ? 23 : 22,
          ),
        }),
      );
      mocks.handleNextAction.mockResolvedValue({
        error: { message: "We are unable to authenticate your payment." },
      });
      await renderReady();
      await pay();
      await until(() =>
        expect(alerts()).toEqual([
          "We are unable to authenticate your payment.",
        ]),
      );
      return requests("pay")[0].id as string;
    }

    it("pays again once the server reports the payment failed", async () => {
      const id = await failVerification();
      server.session.mockImplementation(async () =>
        buildSession({ payment: buildPayment(id, "failed") }),
      );
      mocks.handleNextAction.mockResolvedValue({});
      await pay();
      await until(() => expect(requests("pay")).toHaveLength(2));
      expect(requests("session")).toHaveLength(2);
      expect(requests("pay")[1]).toMatchObject({
        id,
        previousTransactionId: 22,
      });
    });

    it("presents verification again, without a charge, while the server still awaits it", async () => {
      const id = await failVerification();
      server.session.mockImplementation(async () =>
        buildSession({ payment: buildPayment(id, "requires_action") }),
      );
      await pay();
      await until(() =>
        expect(mocks.handleNextAction).toHaveBeenCalledTimes(2),
      );
      expect(requests("session")).toHaveLength(2);
      expect(requests("pay")).toHaveLength(1);
    });

    it.each(["succeeded", "processing"] as const)(
      "leaves for the status page, without a charge, once the server reports the payment %s",
      async (paymentStatus) => {
        const id = await failVerification();
        server.session.mockImplementation(async () =>
          buildSession({ payment: buildPayment(id, paymentStatus) }),
        );
        await pay();
        await until(() =>
          expect(mocks.replace).toHaveBeenCalledWith(
            `/donate/complete?session_id=${id}`,
          ),
        );
        expect(requests("pay")).toHaveLength(1);
      },
    );

    it("takes a new id once the server retired the order and refused the old one", async () => {
      const expiredMessage =
        "This payment was cancelled. Review the refreshed summary before paying again.";
      const id = await failVerification();
      server.session.mockImplementation(async (body: { id?: string }) =>
        buildSession({
          description: "Donation with new tax",
          retired: body.id === id,
        }),
      );
      server.pay.mockImplementation(async (body: { id: string }) =>
        body.id === id
          ? {
              status: "error",
              code: "checkout_expired",
              message: expiredMessage,
            }
          : { status: "success", ...buildPayment(body.id, "failed") },
      );
      await pay();
      await until(() => expect(alerts()).toEqual([expiredMessage]));
      expect(requests("pay")).toHaveLength(2);
      expect(requests("pay")[1]).toMatchObject({
        id,
        previousTransactionId: undefined,
      });
      // One check before the charge, one refresh after the refusal.
      expect(requests("session")).toHaveLength(3);
      expect(container.querySelector(".summary")!.textContent).toContain(
        "Donation with new tax",
      );

      await pay();
      await until(() => expect(requests("pay")).toHaveLength(3));
      expect(requests("pay")[2].id).not.toBe(id);
      expect(requests("pay")[2]).toMatchObject({
        fingerprint: "b".repeat(64),
        previousTransactionId: undefined,
      });
    });

    it("reports a failed check in the form without a charge", async () => {
      await failVerification();
      server.session.mockImplementation(async () => ({
        status: "error",
        message: "Unable to check this payment.",
      }));
      await pay();
      await until(() =>
        expect(alerts()).toEqual(["Unable to check this payment."]),
      );
      expect(requests("pay")).toHaveLength(1);
      expect(container.textContent).toContain("Stripe card form");
    });
  });

  it.each([
    "Sign in before paying.",
    "Too many attempts. Please try again later.",
  ])("shows a rejected Pay in the form: %s", async (message) => {
    const onPaymentStarted = vi.fn();
    server.pay.mockImplementation(async () => ({ status: "error", message }));
    await renderReady({ onPaymentStarted });
    await pay();
    await until(() => expect(alerts()).toEqual([message]));
    expect(onPaymentStarted).not.toHaveBeenCalledWith(true);
  });

  it("keeps the order's id when the Pay request never reaches the server", async () => {
    const unreachable =
      "There was an unexpected problem with your request. Failed to fetch";
    server.pay.mockImplementation(async () => {
      throw ReturnedError(unreachable);
    });
    await renderReady();
    await pay();
    await until(() => expect(alerts()).toEqual([unreachable]));
    expect(container.textContent).toContain("Stripe card form");
    expect(requests("drop")).toEqual([]);

    await pay();
    await until(() => expect(requests("pay")).toHaveLength(2));
    const [first, second] = requests("pay");
    expect(second.id).toBe(first.id);
    expect(requests("drop")).toEqual([]);
  });

  it("starts over for another account and shows nothing signed out", async () => {
    await renderReady();
    const loading = createDeferred<unknown>();
    server.session.mockImplementation(() => loading.promise);

    mocks.user = { state: "authenticated", userId: 8 };
    await render();
    await until(() => expect(requests("session")).toHaveLength(2));
    expect(container.textContent).not.toContain("Donation");
    expect(container.textContent).not.toContain("Stripe card form");
    expect(container.textContent).toContain("Preparing secure payment…");

    mocks.user = { state: "anonymous" };
    await render();
    expect(container.querySelector(".checkout")).toBeNull();
  });

  it("drops first when another tab chose something else for this flow", async () => {
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    // The other tab is another Checkout on the same flow and account with different choices.
    const otherContainer = document.createElement("div");
    document.body.append(otherContainer);
    const otherTab = createRoot(otherContainer);
    await act(async () => otherTab.render(<Flow choices={{ amount: 99 }} />));
    await until(() => expect(otherContainer.textContent).toContain("Pay now"));
    const otherPay = Array.from(otherContainer.querySelectorAll("button")).find(
      (node) => node.textContent === "Pay now",
    );
    await act(async () => otherPay!.click());
    await until(() => expect(requests("pay")).toHaveLength(2));
    const otherId = requests("pay")[1].id;
    expect(otherId).not.toBe(id);
    await act(async () => otherTab.unmount());
    otherContainer.remove();

    const dropsBefore = requests("drop").length;
    await pay();
    await until(() => expect(requests("drop").length).toBe(dropsBefore + 1));
    expect(requests("drop").at(-1)).toEqual({ action: "drop", id: otherId });
    await until(() => expect(container.textContent).toContain("Pay now"));
    expect(requests("pay")).toHaveLength(2);
    expect(alerts()).toEqual([]);
  });

  it("reports card entry to the hold owner", async () => {
    const onActivity = vi.fn();
    await renderReady({ onActivity });
    const element = vi.mocked(PaymentElement).mock.calls.at(-1)![0];
    expect(onActivity).not.toHaveBeenCalled();
    act(() => element.onFocus?.({ elementType: "payment" }));
    act(() =>
      element.onChange?.({
        elementType: "payment",
        empty: false,
        complete: false,
        collapsed: false,
        value: { type: "card" },
      }),
    );
    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it("sends no drop for changed choices until its own Pay settles", async () => {
    const accepted = createDeferred<unknown>();
    server.pay.mockImplementation(() => accepted.promise);
    await renderReady();
    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    const { id } = requests("pay")[0];

    await render({ choices: { amount: 50 } });
    await until(() => expect(requests("pay")).toHaveLength(1));
    expect(requests("drop")).toEqual([]);
    expect(requests("session")).toHaveLength(1);

    await act(async () =>
      accepted.resolve({ status: "success", ...buildPayment(id, "failed") }),
    );
    await until(() =>
      expect(requests("drop")).toEqual([{ action: "drop", id }]),
    );
  });

  it("asks before leaving only while a payment is being processed", async () => {
    function isLeaveConfirmed() {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }
    const accepted = createDeferred<unknown>();
    const verified = createDeferred<object>();
    server.pay.mockImplementation(() => accepted.promise);
    mocks.handleNextAction.mockImplementation(() => verified.promise);
    await renderReady();
    expect(isLeaveConfirmed()).toBe(false);

    await pay();
    await until(() => expect(requests("pay")).toHaveLength(1));
    expect(isLeaveConfirmed()).toBe(true);

    await act(async () =>
      accepted.resolve({
        status: "success",
        ...buildPayment(requests("pay")[0].id, "requires_action"),
      }),
    );
    await until(() => expect(mocks.handleNextAction).toHaveBeenCalled());
    expect(isLeaveConfirmed()).toBe(true);

    await act(async () =>
      verified.resolve({ error: { message: "Verification was cancelled." } }),
    );
    await until(() =>
      expect(alerts()).toEqual(["Verification was cancelled."]),
    );
    expect(isLeaveConfirmed()).toBe(false);
  });
});
