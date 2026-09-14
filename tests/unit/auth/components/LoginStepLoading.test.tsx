/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/auth/server/state", () => ({
  loadPublicAuthState: async () => ({
    state: "proven",
    email: "patron@example.com",
  }),
}));

import StepFlow from "@kenstack/components/StepFlow";
import { createLoginStep } from "@kenstack/auth/components/Login/Step";

// This file starts with the real identity store unseeded, as on the first
// client navigation into a flow without an earlier identity subscriber.
it("keeps the server-selected step while browser identity is being seeded", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.localStorage.clear();
  window.history.replaceState(null, "", "/flow/payment");
  const replace = vi.spyOn(window.history, "replaceState");
  const focus = vi.spyOn(HTMLElement.prototype, "focus");
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  try {
    const flow = await StepFlow({
      basePath: "/flow",
      params: Promise.resolve({ step: "payment" }),
      steps: {
        signin: {
          ...(await createLoginStep()),
          content: <p>Sign in</p>,
          title: "Sign in",
        },
        payment: { content: <p>Payment</p>, title: "Payment" },
      },
    });

    await act(async () => root.render(flow));

    expect(container.querySelector("h2")?.textContent).toBe("Payment");
    expect(replace).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  }
});
