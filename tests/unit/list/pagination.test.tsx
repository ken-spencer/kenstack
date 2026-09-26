/** @vitest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/orders",
  useSearchParams: () =>
    new URLSearchParams("page=6&userId=42&refundStatus=%2Brefunded"),
}));

import PaginationCont from "@kenstack/list/Pagination";

it.each([
  [1, 1],
  [1, 10],
  [5, 10],
  [6, 6],
  [6, 10],
  [7, 10],
  [10, 10],
  [15, 30],
])(
  "marks page %s of %s and preserves navigation filters",
  (page, totalPages) => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(
      <PaginationCont page={page} totalPages={totalPages} />,
    );
    const current = container.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe(String(page));

    const links = [...container.querySelectorAll("a")];
    const numbers = links
      .filter((link) => !link.hasAttribute("aria-label"))
      .map((link) => Number(link.textContent));
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.every((value) => value >= 1 && value <= totalPages)).toBe(
      true,
    );
    expect(numbers.length).toBeLessThanOrEqual(8);
    for (const link of links) {
      const href = new URL(link.href);
      expect(href.pathname).toBe("/admin/orders");
      expect(href.searchParams.get("userId")).toBe("42");
      expect(href.searchParams.get("refundStatus")).toBe("+refunded");
      if (link.getAttribute("aria-disabled") === "true") {
        expect(link.tabIndex).toBe(-1);
      }
    }
    for (const [label, expected] of [
      ["Go to previous page", Math.max(1, page - 1)],
      ["Go to next page", Math.min(totalPages, page + 1)],
    ] as const) {
      const link = container.querySelector<HTMLAnchorElement>(
        `a[aria-label="${label}"]`,
      )!;
      expect(Number(new URL(link.href).searchParams.get("page") ?? "1")).toBe(
        expected,
      );
    }
  },
);
