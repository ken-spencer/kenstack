/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Combobox from "@kenstack/forms/controls/Combobox";

const provinces = [
  { label: "Alberta", value: "AB" },
  { label: "British Columbia", value: "BC" },
];

describe("Combobox keyboard focus", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Element.prototype.scrollIntoView = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("highlights the selected option when focus opens the list", () => {
    act(() => {
      root.render(<Combobox options={provinces} value="BC" />);
    });

    const input = container.querySelector<HTMLInputElement>("input");
    expect(input).not.toBeNull();

    act(() => input?.focus());

    const activeOption = document.getElementById(
      input?.getAttribute("aria-activedescendant") ?? "",
    );
    expect(activeOption?.textContent).toContain("British Columbia");
    expect(activeOption?.getAttribute("aria-selected")).toBe("true");
  });
});
