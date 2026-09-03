/** @vitest-environment jsdom */

import { act, StrictMode, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

const firstToken = "a".repeat(43);
const nextToken = "b".repeat(43);

function ConsumedValue({ replaceToken }: { replaceToken?: string }) {
  const value = useConsumedSearchParam("token");

  useLayoutEffect(() => {
    if (replaceToken) {
      window.history.replaceState(null, "", `?token=${replaceToken}`);
    }
  }, [replaceToken]);

  return <span>{value}</span>;
}

describe("useConsumedSearchParam", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    window.history.replaceState(null, "", `?token=${firstToken}`);
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.clearAllMocks();
  });

  it("does not remove a replacement that appeared before cleanup", async () => {
    await act(async () => {
      root.render(
        <StrictMode>
          <ConsumedValue replaceToken={nextToken} />
        </StrictMode>,
      );
    });

    expect(new URLSearchParams(window.location.search).get("token")).toBe(
      nextToken,
    );
    expect(container.textContent).toBe(firstToken);

    await act(async () => {
      root.render(
        <StrictMode>
          <ConsumedValue />
        </StrictMode>,
      );
    });

    expect(window.location.search).toBe("");
    expect(container.textContent).toBe(nextToken);
  });
});
