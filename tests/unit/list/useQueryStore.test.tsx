/** @vitest-environment jsdom */

import { act, useMemo, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as z from "zod";

const navigation = vi.hoisted(() => ({ search: "" }));

vi.mock("next/navigation", () => ({
  useSearchParams: () => {
    const search = useSyncExternalStore(
      (notify) => {
        const update = () => {
          navigation.search = window.location.search;
          notify();
        };
        window.addEventListener("popstate", update);
        window.addEventListener("next-search", update);
        return () => {
          window.removeEventListener("popstate", update);
          window.removeEventListener("next-search", update);
        };
      },
      () => navigation.search,
    );
    return useMemo(() => new URLSearchParams(search), [search]);
  },
}));
import useQueryStore from "@kenstack/list/useQueryStore";

const schema = z.object({ q: z.string().default("") });
const onPopState = vi.fn();
function Search() {
  const [value, debounced, setValue, searchParams] = useQueryStore(
    { q: "" },
    {
      schema,
      serialize: (value) =>
        new URLSearchParams({ q: value.q.trim().toLowerCase() }),
      routerMode: "push",
      onPopState,
    },
  );
  return (
    <>
      <input
        aria-label="Search"
        value={value.q}
        onChange={(event) => setValue({ q: event.target.value })}
      />
      <output>{debounced.q}</output>
      <span data-page>{searchParams.get("page") ?? "none"}</span>
      <button onClick={() => setValue({ q: "Horror" }, false)}>Horror</button>
    </>
  );
}
const pushState = window.history.pushState.bind(window.history);
const replaceState = window.history.replaceState.bind(window.history);
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.useFakeTimers();
  onPopState.mockClear();
  window.history.replaceState(null, "", "/base/catalogue?q=drama#collection");
  navigation.search = window.location.search;
  for (const method of ["pushState", "replaceState"] as const) {
    const write = window.history[method].bind(window.history);
    vi.spyOn(window.history, method).mockImplementation((...args) => {
      write(...args);
      window.dispatchEvent(new Event("next-search"));
    });
  }
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("preserves the browser base path and anchor when writing a filter", async () => {
  await act(async () => root.render(<Search />));
  await act(async () => container.querySelector("button")!.click());
  expect(
    window.location.pathname + window.location.search + window.location.hash,
  ).toBe("/base/catalogue?q=horror#collection");
});

it("does not push an already-current URL or swallow the following Back", async () => {
  await act(async () => root.render(<Search />));
  // Browser URL can move before Next delivers its search-parameter update.
  replaceState(null, "", "/base/catalogue?q=horror#collection");
  const push = vi.mocked(window.history.pushState);
  await act(async () => container.querySelector("button")!.click());
  expect(push).not.toHaveBeenCalled();
  await act(async () => {
    window.history.replaceState(
      null,
      "",
      "/base/catalogue?q=comedy#collection",
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(container.querySelector("input")?.value).toBe("comedy");
  expect(container.querySelector("output")?.textContent).toBe("comedy");
});

it("cancels pending typed filters when browser navigation restores another search", async () => {
  await act(async () => root.render(<Search />));
  const input = container.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(input, "Alien");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    window.history.replaceState(
      null,
      "",
      "/base/catalogue?q=comedy#collection",
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await act(async () => vi.advanceTimersByTime(500));
  expect(input.value).toBe("comedy");
  expect(container.querySelector("output")?.textContent).toBe("comedy");
  expect(window.location.search).toBe("?q=comedy");
  expect(onPopState).toHaveBeenLastCalledWith({ q: "comedy" });
});

it("restores filters on Back after the store's own push updates Next search params", async () => {
  await act(async () => root.render(<Search />));
  await act(async () => container.querySelector("button")!.click());
  expect(container.querySelector("input")!.value).toBe("Horror");
  await act(async () => {
    replaceState(null, "", "/base/catalogue?q=drama#collection");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(container.querySelector("input")!.value).toBe("drama");
  expect(onPopState).toHaveBeenLastCalledWith({ q: "drama" });
});

it("does not add history for equivalent query encodings", async () => {
  replaceState(null, "", "/base/catalogue?q=a%20b#collection");
  navigation.search = window.location.search;
  await act(async () => root.render(<Search />));
  await act(async () => {
    const input = container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "a b ");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    vi.advanceTimersByTime(500);
  });
  expect(window.history.pushState).not.toHaveBeenCalled();
  await act(async () => {
    replaceState(null, "", "/base/catalogue?q=drama#collection");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(container.querySelector("input")!.value).toBe("drama");
});

it("drops the page param as soon as the store writes the URL", async () => {
  replaceState(null, "", "/base/catalogue?q=drama&page=3#collection");
  navigation.search = window.location.search;
  // Next delivers its search-parameter update a render after the write.
  vi.mocked(window.history.pushState).mockImplementation((...args) => {
    pushState(...args);
    setTimeout(() => window.dispatchEvent(new Event("next-search")), 0);
  });
  await act(async () => root.render(<Search />));
  const page = () => container.querySelector("[data-page]")?.textContent;
  expect(page()).toBe("3");
  await act(async () => container.querySelector("button")!.click());
  expect(navigation.search).toBe("?q=drama&page=3");
  expect(page()).toBe("none");
  await act(async () => vi.advanceTimersByTime(0));
  expect(navigation.search).toBe("?q=horror");
  expect(page()).toBe("none");
});
