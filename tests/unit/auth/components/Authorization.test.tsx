/** @vitest-environment jsdom */

import { act, Activity, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Authorization } from "@kenstack/auth/reauthentication/server";

const mocks = vi.hoisted(() => ({ fetcher: vi.fn() }));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import ReauthenticationFormClient from "@kenstack/auth/reauthentication/FormClient";

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const now = Date.parse("2026-09-25T12:00:00Z");
function grant(sessionId = 1, remainingMs = 1000, userId = 1): Authorization {
  return {
    remainingMs,
    sessionId,
    userId,
    authorizedUntil: new Date(Date.now() + remainingMs).toISOString(),
  };
}
let reportGrant: ((authorization: Authorization) => void) | undefined;
let send: PromiseWithResolvers<{ status: string }> | undefined;
function Child() {
  const authorization = useAuthorization();
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    reportGrant = authorization?.setAuthorization;
  }, [authorization]);
  return (
    <>
      <input aria-label="Draft" defaultValue="draft" />
      <button
        onClick={() => {
          send = Promise.withResolvers();
          void authorization.track(send.promise, { rotatesSession: true });
        }}
      >
        Send
      </button>
      <button onClick={() => setSaved(true)}>Save</button>
      {saved ? <output data-saved /> : null}
    </>
  );
}
function render(authorization: Authorization) {
  return act(async () =>
    root.render(
      <ReauthenticationFormClient
        authorization={authorization}
        loginForm={<form data-login />}
        message="Confirm your identity."
      >
        <Child />
      </ReauthenticationFormClient>,
    ),
  );
}
function click() {
  return act(async () =>
    container
      .querySelector("input")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers({
    toFake: ["Date", "performance", "setTimeout", "clearTimeout"],
  });
  vi.setSystemTime(now);
  mocks.fetcher.mockReset();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
});

it("coalesces activity and adopts only the server's longer deadline", async () => {
  const response = Promise.withResolvers<unknown>();
  mocks.fetcher.mockReturnValue(response.promise);
  await render(grant());
  await click();
  await click();
  expect(mocks.fetcher).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(1500));
  expect(container.querySelector("input")).not.toBeNull();
  await act(async () =>
    response.resolve({ status: "success", authorization: grant(1, 600_000) }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(container.querySelector("input")).not.toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(540_001));
  expect(container.querySelector("[data-login]")).not.toBeNull();
});

it("does not extend on activity while two minutes remain", async () => {
  await render(grant(1, 120_000));
  await click();
  expect(mocks.fetcher).not.toHaveBeenCalled();
});

it("preserves mounted children on same-session grants and rotation and rejects old-session responses", async () => {
  const response = Promise.withResolvers<unknown>();
  mocks.fetcher.mockReturnValue(response.promise);
  await render(grant());
  const input = container.querySelector("input");
  await click();
  const oldReport = reportGrant;
  await render(grant(2, 5000));
  expect(container.querySelector("input")).toBe(input);
  await act(async () => oldReport?.(grant(1, 600_000)));
  await act(async () =>
    response.resolve({ status: "success", authorization: grant(1, 600_000) }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(5001));
  expect(container.querySelector("[data-login]")).not.toBeNull();
});

it("older same-session success or refusal cannot undo a newer grant", async () => {
  const response = Promise.withResolvers<unknown>();
  mocks.fetcher.mockReturnValue(response.promise);
  await render(grant());
  const input = container.querySelector("input");
  await click();
  await act(async () => reportGrant?.(grant(1, 600_000)));
  await act(async () => reportGrant?.(grant(1, 10_000)));
  await act(async () =>
    response.resolve({ status: "error", code: "reauthentication-required" }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(60_001));
  expect(container.querySelector("input")).toBe(input);
});

it("bounds an unanswered request and does not keep renewing expired permission", async () => {
  mocks.fetcher.mockReturnValue(new Promise(() => {}));
  await render(grant());
  await click();
  await act(async () => vi.advanceTimersByTimeAsync(2000));
  await click();
  expect(mocks.fetcher).toHaveBeenCalledOnce();
  await act(async () => vi.advanceTimersByTimeAsync(58_001));
  expect(container.querySelector("[data-login]")).not.toBeNull();
});

it("keeps a participating completion mounted until its refreshed session arrives", async () => {
  mocks.fetcher.mockReturnValue(new Promise(() => {}));
  await render(grant());
  const input = container.querySelector("input");
  await act(async () => container.querySelector("button")?.click());
  await act(async () => vi.advanceTimersByTimeAsync(1500));
  await act(async () => {
    container.querySelectorAll("button")[1]?.click();
    send?.resolve({ status: "success" });
  });
  await render(grant(2, 600_000));
  expect(container.querySelector("input")).toBe(input);
  expect(container.querySelector("[data-saved]")).not.toBeNull();
});

it("clears the previous account's draft when the account changes", async () => {
  await render(grant(1, 600_000));
  const input = container.querySelector("input");
  await render(grant(2, 600_000, 2));
  expect(container.querySelector("input")).not.toBe(input);
});

it("uses server remaining time despite a browser clock an hour ahead", async () => {
  const authorization = grant();
  vi.setSystemTime(now + 3600_000);
  const response = Promise.withResolvers<unknown>();
  mocks.fetcher.mockReturnValue(response.promise);
  await render(authorization);
  await click();
  expect(mocks.fetcher).toHaveBeenCalledOnce();
  await act(async () =>
    response.resolve({
      status: "success",
      authorization: {
        ...authorization,
        authorizedUntil: new Date(now + 600_000).toISOString(),
        remainingMs: 600_000,
      },
    }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(599_999));
  expect(container.querySelector("input")).not.toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(1));
  expect(container.querySelector("[data-login]")).not.toBeNull();
});

it("uses an explicit server refusal to require identity confirmation immediately", async () => {
  mocks.fetcher.mockResolvedValue({
    status: "error",
    code: "reauthentication-required",
  });
  await render(grant(1, 60_000));
  await click();
  expect(container.querySelector("[data-login]")).not.toBeNull();
});

it("keeps existing permission after an unrelated request error", async () => {
  mocks.fetcher.mockResolvedValue({ status: "error", code: "invalid-request" });
  await render(grant(1, 60_000));
  await click();
  expect(container.querySelector("input")).not.toBeNull();
  await act(async () => vi.advanceTimersByTimeAsync(60_001));
  expect(container.querySelector("[data-login]")).not.toBeNull();
});

it("renews the replacement session while an old-session renewal is still pending", async () => {
  const oldResponse = Promise.withResolvers<unknown>();
  const newResponse = Promise.withResolvers<unknown>();
  mocks.fetcher
    .mockReturnValueOnce(oldResponse.promise)
    .mockReturnValueOnce(newResponse.promise);
  await render(grant());
  await click();
  await render(grant(2, 5000));
  await click();
  expect(mocks.fetcher).toHaveBeenCalledTimes(2);
  expect(mocks.fetcher.mock.lastCall?.[1]).toMatchObject({
    sessionId: 2,
  });
  await act(async () =>
    oldResponse.resolve({
      status: "success",
      authorization: grant(1, 600_000),
    }),
  );
  await click();
  expect(mocks.fetcher).toHaveBeenCalledTimes(2);
  await act(async () =>
    newResponse.resolve({
      status: "success",
      authorization: grant(2, 600_000),
    }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(60_001));
  expect(container.querySelector("input")).not.toBeNull();
});

it("applies a renewal settled while Activity is hidden and permits the next renewal", async () => {
  const response = Promise.withResolvers<unknown>();
  mocks.fetcher
    .mockReturnValueOnce(response.promise)
    .mockReturnValue(new Promise(() => {}));
  const authorization = grant();
  const tree = (mode: "visible" | "hidden") => (
    <Activity mode={mode}>
      <ReauthenticationFormClient
        authorization={authorization}
        loginForm={<form data-login />}
        message="Confirm your identity."
      >
        <Child />
      </ReauthenticationFormClient>
    </Activity>
  );
  await act(async () => root.render(tree("visible")));
  await click();
  await act(async () => root.render(tree("hidden")));
  await act(async () =>
    response.resolve({ status: "success", authorization: grant(1, 600_000) }),
  );
  await act(async () => vi.advanceTimersByTimeAsync(480_001));
  await act(async () => root.render(tree("visible")));
  expect(container.querySelector("input")).not.toBeNull();
  await click();
  expect(mocks.fetcher).toHaveBeenCalledTimes(2);
});
