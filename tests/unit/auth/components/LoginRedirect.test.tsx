/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { notifyManager } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  assign: vi.fn(),
  refresh: vi.fn(),
}));
const router = vi.hoisted(() => ({ refresh: mocks.refresh }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("@kenstack/auth/useUserInfo", () => ({ setUserInfo: vi.fn() }));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));
vi.mock("@kenstack/components/StepFlow/StepActions", () => ({
  StepActions: () => <button type="submit">Continue</button>,
}));

import LoginForm from "@kenstack/auth/components/Login/Form";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const browserWindow = window;
  const location = { assign: mocks.assign };
  const browserLocation = new Proxy(location, {
    get: (target, key) =>
      key === "assign"
        ? target.assign
        : Reflect.get(browserWindow.location, key),
  });
  vi.stubGlobal(
    "window",
    new Proxy(browserWindow, {
      get: (target, key) =>
        key === "location" ? browserLocation : Reflect.get(target, key),
    }),
  );
  notifyManager.setScheduler((callback) => callback());
  mocks.fetcher.mockResolvedValue({
    status: "success",
    path: "/account",
    authState: {},
  });
  document.cookie = "loginMethod=password; path=/";
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  notifyManager.setScheduler((callback) => setTimeout(callback, 0));
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

it.each(["code", "link", "already-verified"])(
  "keeps the standalone %s screen until navigation unloads it",
  async (method) => {
    window.history.replaceState(
      null,
      "",
      method === "link" ? `/login?token=${"a".repeat(43)}` : "/login",
    );
    await act(async () =>
      root.render(
        <LoginForm
          email="patron@example.com"
          challengeKey={
            method === "code"
              ? "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55"
              : undefined
          }
        />,
      ),
    );
    if (method === "code") {
      const input =
        container.querySelector<HTMLInputElement>('input[name="code"]');
      expect(input).not.toBeNull();
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set?.call(input, "123456");
        input?.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    if (method === "already-verified")
      await act(async () =>
        container
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.assign).toHaveBeenCalledExactlyOnceWith("/account");
    expect(container.querySelector('input[name="email"]')).toBeNull();
    expect(document.cookie).toContain("loginMethod=password");
    if (method === "link")
      expect(container.textContent).toContain("Signing you in");
    if (method === "code")
      expect(container.querySelector('input[name="code"]')).not.toBeNull();
  },
);

it("completes an embedded link in its owner without assigning a location or remembering a method", async () => {
  const onComplete = vi.fn();
  window.history.replaceState(null, "", `/flow/signin?token=${"b".repeat(43)}`);
  await act(async () =>
    root.render(
      <LoginForm
        anchor="steps"
        entryPath="/flow/signin"
        mode="embedded"
        onComplete={onComplete}
      />,
    ),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(onComplete).toHaveBeenCalledOnce();
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(mocks.assign).not.toHaveBeenCalled();
  expect(container.querySelector('input[name="email"]')).toBeNull();
  expect(document.cookie).toContain("loginMethod=password");
});
