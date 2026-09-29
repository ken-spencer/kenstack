/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import ReauthenticationFormClient from "@kenstack/auth/reauthentication/FormClient";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
function render(userId: number) {
  return act(async () =>
    root.render(
      <ReauthenticationFormClient
        loginForm={<form data-login />}
        message="Confirm your identity."
        userId={userId}
      >
        <input aria-label="Draft" defaultValue="draft" />
      </ReauthenticationFormClient>,
    ),
  );
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
});

it("clears the previous account's draft when the account changes", async () => {
  await render(1);
  const input = container.querySelector("input");
  await render(2);
  expect(container.querySelector("input")).not.toBe(input);
});
