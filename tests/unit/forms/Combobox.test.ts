import type { FocusEvent, KeyboardEvent, ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import Combobox from "@kenstack/forms/controls/Combobox";

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  useRef: <T>(initialValue: T) => ({ current: initialValue }),
}));

const options = [
  { label: "Apple Juice", value: "apple", keywords: ["red"] },
  { label: "Orange Juice", value: "orange", keywords: ["citrus"] },
  { label: "Orange Soda", value: "orange-soda" },
  { label: "Water", value: "water", disabled: true },
] as const;

type RenderedCombobox = ReactElement<{
  children: ReactElement<{
    onBlur: (event: FocusEvent<HTMLInputElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  }>[];
  onInputValueChange: (value: string) => void;
}>;

function typeAndBlur(value: string) {
  const onValueChange = vi.fn();
  const combobox = Combobox({
    options,
    onValueChange,
  }) as RenderedCombobox;

  combobox.props.onInputValueChange(value);
  combobox.props.children[0].props.onBlur({} as FocusEvent<HTMLInputElement>);

  return onValueChange;
}

describe("Combobox typed value matching", () => {
  it("prefers an exact label or value match", () => {
    expect(typeAndBlur(" APPLE ")).toHaveBeenCalledWith("apple", options[0]);
    expect(typeAndBlur("Orange Juice")).toHaveBeenCalledWith(
      "orange",
      options[1],
    );
  });

  it("commits a single partial or keyword match", () => {
    expect(typeAndBlur("citrus")).toHaveBeenCalledWith("orange", options[1]);
    expect(typeAndBlur("red")).toHaveBeenCalledWith("apple", options[0]);
  });

  it("does not guess between multiple matches", () => {
    expect(typeAndBlur("orange")).toHaveBeenCalledWith("orange", options[1]);
    expect(typeAndBlur("juice")).not.toHaveBeenCalled();
  });

  it("does not commit disabled or empty options", () => {
    expect(typeAndBlur("water")).not.toHaveBeenCalled();
    expect(typeAndBlur("   ")).toHaveBeenCalledWith("", null);
  });

  it("discards a typed value when Escape closes the picker", () => {
    const onValueChange = vi.fn();
    const combobox = Combobox({
      options,
      onValueChange,
    }) as RenderedCombobox;

    combobox.props.onInputValueChange("red");
    combobox.props.children[0].props.onKeyDown({
      key: "Escape",
    } as KeyboardEvent<HTMLInputElement>);
    combobox.props.children[0].props.onBlur({} as FocusEvent<HTMLInputElement>);

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps a typed value when Escape is prevented", () => {
    const onValueChange = vi.fn();
    const combobox = Combobox({
      inputProps: {
        onKeyDown: (event) => event.preventDefault(),
      },
      options,
      onValueChange,
    }) as RenderedCombobox;
    const event = {
      defaultPrevented: false,
      key: "Escape",
      preventDefault() {
        this.defaultPrevented = true;
      },
    } as KeyboardEvent<HTMLInputElement>;

    combobox.props.onInputValueChange("red");
    combobox.props.children[0].props.onKeyDown(event);
    combobox.props.children[0].props.onBlur({} as FocusEvent<HTMLInputElement>);

    expect(onValueChange).toHaveBeenCalledWith("apple", options[0]);
  });
});
