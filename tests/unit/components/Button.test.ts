import { describe, expect, it } from "vitest";

import { buttonVariants } from "@kenstack/components/Button";

describe("buttonVariants", () => {
  it("emits the additive class contract for host themes", () => {
    expect(buttonVariants()).toBe("button primary medium");
    expect(buttonVariants({ size: "lg", variant: "outline" })).toBe(
      "button outline large",
    );
    expect(buttonVariants({ size: "icon-sm", variant: "ghost" })).toBe(
      "button ghost icon small",
    );
  });

  it("preserves consumer layout classes", () => {
    expect(buttonVariants({ className: "w-full" })).toBe(
      "button primary medium w-full",
    );
  });
});
