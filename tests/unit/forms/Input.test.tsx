import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Input } from "@kenstack/forms/controls/Input";

describe("Input", () => {
  it("renders start and end adornments without taking input attributes", () => {
    const markup = renderToStaticMarkup(
      <Input
        aria-label="Website"
        endAdornment={<span>End</span>}
        id="website"
        startAdornment={<span>Start</span>}
      />,
    );

    expect(markup).toContain("Start");
    expect(markup).toContain("End");
    expect(markup).toContain('id="website"');
    expect(markup).toContain('aria-label="Website"');
    expect(markup).toContain("ps-9");
    expect(markup).toContain("pe-9");
  });
});
