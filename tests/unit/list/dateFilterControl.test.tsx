/** @vitest-environment jsdom */

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import type { AdminFilterMeta } from "@kenstack/admin/types/list";
import FilterControl from "@kenstack/list/FilterControl";
import type { ListQueryStoreState } from "@kenstack/list/querySchema";

const dateFilter: AdminFilterMeta[] = [
  { name: "publishedAt", label: "Published", kind: "date-range" },
];

function Filters({ initial }: { initial: Record<string, unknown> }) {
  const [filters, setFilters] = useState<ListQueryStoreState>({
    keywords: "",
    trash: false,
    sort: "createdAt",
    direction: "desc",
    filters: initial,
  });

  return (
    <>
      <FilterControl
        filter={dateFilter}
        filters={filters}
        setFilters={setFilters}
        showLabel
        tooltip={false}
      />
      <output>{JSON.stringify(filters.filters)}</output>
    </>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(initial: Record<string, unknown>) {
  await act(async () => root.render(<Filters initial={initial} />));
  act(() =>
    container
      .querySelector<HTMLButtonElement>('[aria-label="Filters"]')!
      .click(),
  );
}

async function changeDate(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  });
}

it("edits and clears a generic calendar-date filter", async () => {
  await render({ publishedAt: { from: "2026-09-01" } });
  const input = document.querySelector<HTMLInputElement>(
    '[aria-label="Published from"]',
  )!;
  expect(input.value).toBe("September 1, 2026");

  await changeDate(input, "September 14, 2026");
  expect(document.querySelector("output")!.textContent).toBe(
    '{"publishedAt":{"from":"2026-09-14"}}',
  );

  await changeDate(input, "");
  expect(document.querySelector("output")!.textContent).toBe("{}");
});

it("retains the applied date when invalid text is committed", async () => {
  await render({ publishedAt: { from: "2026-09-01" } });
  const input = document.querySelector<HTMLInputElement>(
    '[aria-label="Published from"]',
  )!;

  await changeDate(input, "not-a-date");

  expect(input.value).toBe("September 1, 2026");
  expect(document.querySelector("output")!.textContent).toBe(
    '{"publishedAt":{"from":"2026-09-01"}}',
  );
});

it("interprets today using the venue day when the device has crossed midnight", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-02T03:30:00.000Z"));
  try {
    await render({ publishedAt: { from: "2026-09-01" } });
    const input = document.querySelector<HTMLInputElement>(
      '[aria-label="Published from"]',
    )!;
    await changeDate(input, "today");
    expect(document.querySelector("output")!.textContent).toBe(
      '{"publishedAt":{"from":"2026-09-01"}}',
    );
  } finally {
    vi.useRealTimers();
  }
});
