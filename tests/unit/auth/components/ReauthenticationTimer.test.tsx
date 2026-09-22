/** @vitest-environment jsdom */

import { act, Activity } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import ReauthenticationTimer from "@kenstack/auth/reauthentication/Timer";

let root: ReturnType<typeof createRoot>;
const replace = vi.fn();

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  replace.mockClear();
  vi.stubGlobal("window", {
    location: { pathname: "/account/password", search: "", hash: "", replace },
    setTimeout,
    clearTimeout,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
  });
  root = createRoot(document.createElement("div"));
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("returns to login when the server-supplied time remaining elapses without a submit", () => {
  act(() => root.render(<ReauthenticationTimer remainingMs={20_000} />));
  act(() => vi.advanceTimersByTime(19_999));
  expect(replace).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(replace).toHaveBeenCalledWith("/login?returnTo=%2Faccount%2Fpassword");
});

it("does not grant more time when a hidden form is restored", () => {
  act(() =>
    root.render(
      <Activity mode="visible">
        <ReauthenticationTimer remainingMs={20_000} />
      </Activity>,
    ),
  );
  act(() => vi.advanceTimersByTime(10_000));
  act(() =>
    root.render(
      <Activity mode="hidden">
        <ReauthenticationTimer remainingMs={20_000} />
      </Activity>,
    ),
  );
  act(() => vi.advanceTimersByTime(15_000));
  expect(replace).not.toHaveBeenCalled();
  act(() =>
    root.render(
      <Activity mode="visible">
        <ReauthenticationTimer remainingMs={20_000} />
      </Activity>,
    ),
  );
  act(() => vi.advanceTimersByTime(0));
  expect(replace).toHaveBeenCalledOnce();
});

it("cancels the redirect after leaving the sensitive page", () => {
  act(() => root.render(<ReauthenticationTimer remainingMs={20_000} />));
  act(() => root.render(null));
  act(() => vi.advanceTimersByTime(20_000));
  expect(replace).not.toHaveBeenCalled();
});

it("still redirects when the remaining delay contains a fraction of a millisecond", () => {
  act(() => root.render(<ReauthenticationTimer remainingMs={20_000.25} />));
  act(() => vi.advanceTimersByTime(20_000));
  expect(replace).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(replace).toHaveBeenCalledOnce();
});
