/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";

import Form from "@kenstack/forms/Form";
import GroupField from "@kenstack/forms/GroupField";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// The status outlet scrolls itself into view; jsdom has no layout.
Element.prototype.scrollIntoView = () => {};

describe("GroupField", () => {
  it("focuses an invalid group and links its error message", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <Form
          defaultValues={{ plan: "" }}
          mutationFn={async () => ({ status: "success" as const })}
          schema={z.object({ plan: z.string().min(1, "Choose a plan") })}
          onSubmit={({ data, mutation }) => {
            mutation.mutate(data);
          }}
        >
          <GroupField
            label="Plan"
            name="plan"
            render={({ field }) => (
              <button onClick={() => field.onChange("basic")} type="button">
                Basic
              </button>
            )}
          />
          <button type="submit">Continue</button>
        </Form>,
      );
    });

    await act(async () => {
      container.querySelector("form")?.requestSubmit();
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Choose a plan"),
    );

    const fieldset = container.querySelector("fieldset");
    expect(fieldset?.querySelector("legend")?.textContent).toBe("Plan");
    expect(document.activeElement).toBe(fieldset);
    expect(fieldset?.getAttribute("aria-invalid")).toBe("true");

    const messageId = fieldset
      ?.getAttribute("aria-describedby")
      ?.split(" ")
      .find(
        (id) => document.getElementById(id)?.textContent === "Choose a plan",
      );
    expect(messageId).toBeDefined();

    act(() => root.unmount());
  });
});
