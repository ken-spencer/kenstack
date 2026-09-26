/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  refresh: vi.fn(),
  setUserInfo: vi.fn(),
  token: null as string | null,
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@kenstack/hooks/useConsumedSearchParam", () => ({
  default: (name: string) =>
    name === "confirmEmailChange" ? mocks.token : null,
}));
vi.mock("@kenstack/auth/useUserInfo", () => ({
  setUserInfo: mocks.setUserInfo,
  useUserInfo: () => ({ state: "authenticated", email: "old@example.com" }),
}));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));
import EmailChange from "@kenstack/auth/components/EmailChange";
import ReauthenticationFormClient from "@kenstack/auth/reauthentication/FormClient";
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
function grant(sessionId = 1, remainingMs = 1000) {
  return {
    sessionId,
    userId: 1,
    remainingMs,
    authorizedUntil: new Date(Date.now() + remainingMs).toISOString(),
  };
}
function render(authorization = grant()) {
  return act(async () =>
    root.render(
      <ReauthenticationFormClient
        authorization={authorization}
        loginForm={<form data-login />}
        message="Confirm your identity."
      >
        <EmailChange />
      </ReauthenticationFormClient>,
    ),
  );
}
async function input(name: string, value: string) {
  await act(async () => {
    const field = container.querySelector<HTMLInputElement>(
      `input[name="${name}"]`,
    );
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(field, value);
    field?.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = vi.fn();
  vi.useFakeTimers({
    toFake: ["Date", "performance", "setTimeout", "clearTimeout"],
  });
  mocks.fetcher.mockReset();
  mocks.refresh.mockClear();
  mocks.setUserInfo.mockClear();
  mocks.token = null;
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

it("keeps a slow code send mounted across expiry, applies its grant without refresh, and preserves completion through rotation", async () => {
  const send = Promise.withResolvers<unknown>();
  const verify = Promise.withResolvers<unknown>();
  mocks.fetcher.mockImplementation((_path, data) => {
    if (data.action === "email-change") return send.promise;
    if (data.action === "verify-email-change-code") return verify.promise;
    return new Promise(() => {});
  });
  await render();
  await input("email", "new@example.com");
  await submit();
  await act(async () => vi.advanceTimersByTimeAsync(1500));
  expect(container.querySelector("[data-login]")).toBeNull();
  await act(async () =>
    send.resolve({
      status: "success",
      challengeKey: "challenge",
      email: "new@example.com",
      authorization: grant(1, 10_000),
    }),
  );
  expect(container.querySelector('input[name="code"]')).not.toBeNull();
  expect(mocks.refresh).not.toHaveBeenCalled();
  await input("code", "123456");
  await submit();
  await act(async () => vi.advanceTimersByTimeAsync(10_001));
  expect(container.querySelector('input[name="code"]')).not.toBeNull();
  const authState = { state: "authenticated", email: "new@example.com" };
  await act(async () => verify.resolve({ status: "success", authState }));
  expect(mocks.setUserInfo).toHaveBeenCalledWith(authState);
  expect(mocks.refresh).toHaveBeenCalledOnce();
  const content = container.textContent;
  await render(grant(2, 600_000));
  expect(container.textContent).toBe(content);
  expect(container.textContent).toContain("new@example.com");
});

it("keeps a link confirmation pending across expiry until the result and refreshed session arrive", async () => {
  mocks.token = "token";
  const verify = Promise.withResolvers<unknown>();
  mocks.fetcher.mockReturnValue(verify.promise);
  await render();
  await act(async () => vi.advanceTimersByTimeAsync(1500));
  expect(container.querySelector("[data-login]")).toBeNull();
  await act(async () =>
    verify.resolve({
      status: "success",
      authState: { state: "authenticated", email: "new@example.com" },
    }),
  );
  expect(mocks.refresh).toHaveBeenCalledOnce();
  await render(grant(2, 600_000));
  expect(container.querySelector("[data-login]")).toBeNull();
  expect(container.textContent).toContain("new@example.com");
});
