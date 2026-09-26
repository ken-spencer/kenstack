/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";

import Form from "@kenstack/forms/Form";
import GroupField from "@kenstack/forms/GroupField";
import InputField from "@kenstack/forms/InputField";
import SelectField from "@kenstack/forms/SelectField";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// jsdom has no layout; observe which element the action scrolls to.
const scrollIntoView = vi.fn();
Element.prototype.scrollIntoView = scrollIntoView;

describe("form notice", () => {
  it.each([false, true])(
    "moves to the first remaining error in its own form (group: %s)",
    async (group) => {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const onSubmit = vi.fn();

      act(() => {
        root.render(
          <>
            <form>
              <input aria-invalid="true" aria-label="Another form's error" />
              <p data-slot="form-message" tabIndex={-1}>
                Another form&apos;s error
              </p>
            </form>
            <Form
              defaultValues={{ first: "", second: "" }}
              schema={z.object({
                second: z.string().min(1, "Complete the second field"),
                first: z.string().min(1, "Complete the first field"),
              })}
              onSubmit={onSubmit}
            >
              {group ? (
                <GroupField
                  name="first"
                  label="First"
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange("chosen")}
                    >
                      Choose
                    </button>
                  )}
                />
              ) : (
                <InputField name="first" label="First" />
              )}
              <InputField name="second" label="Second" />
            </Form>
          </>,
        );
      });

      const form = container.querySelectorAll("form")[1];
      expect(form.textContent).not.toContain("View error");
      await act(async () => form.requestSubmit());

      const button = Array.from(form.querySelectorAll("button")).find(
        (button) => button.textContent === "View error",
      )!;
      expect(button.type).toBe("button");
      button.focus();
      await act(async () => button.click());

      const first = form.querySelector('[data-slot="form-message"]');
      expect(first?.textContent).toBe("Complete the first field");
      expect(document.activeElement).toBe(
        form.querySelector(group ? "fieldset" : 'input[name="first"]'),
      );
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(first);
      expect(onSubmit).not.toHaveBeenCalled();

      scrollIntoView.mockClear();
      await act(async () => {
        if (group) {
          form
            .querySelector("fieldset button")!
            .dispatchEvent(new MouseEvent("click", { bubbles: true }));
        } else {
          const input = form.querySelector<HTMLInputElement>(
            'input[name="first"]',
          )!;
          input.focus();
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )!.set!.call(input, "fixed");
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      expect(form.textContent).not.toContain("Complete the first field");
      expect(scrollIntoView).not.toHaveBeenCalled();

      button.focus();
      await act(async () => button.click());
      const error = form.querySelector('[data-slot="form-message"]');
      expect(error?.textContent).toBe("Complete the second field");
      expect(document.activeElement).toBe(
        form.querySelector('input[name="second"]'),
      );
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(error);

      scrollIntoView.mockClear();
      const second = form.querySelector<HTMLInputElement>(
        'input[name="second"]',
      )!;
      await act(async () => {
        second.focus();
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(second, "fixed");
        second.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(form.querySelector('[role="alert"]')).toBeNull();
      expect(form.textContent).not.toContain("View error");
      expect(document.activeElement).toBe(second);
      expect(scrollIntoView).not.toHaveBeenCalled();

      act(() => root.unmount());
      container.remove();
    },
  );

  it("reaches a select error even when its control has no invalid marker", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <Form
          defaultValues={{ choice: "", name: "" }}
          schema={z.object({
            choice: z.string().min(1, "Choose an option"),
            name: z.string().min(1, "Enter a name"),
          })}
          onSubmit={vi.fn()}
        >
          <SelectField
            name="choice"
            label="Choice"
            options={[{ value: "one", label: "One" }]}
          />
          <InputField name="name" label="Name" />
        </Form>,
      );
    });
    await act(async () => container.querySelector("form")!.requestSubmit());
    const button = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "View error",
    )!;
    await act(async () => button.click());
    expect(document.activeElement?.textContent).toBe("Choose an option");
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(document.activeElement);
    act(() => root.unmount());
    container.remove();
  });

  it("does not offer field navigation for errors shown only in the notice", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Form
          defaultValues={{ name: "" }}
          schema={z.object({ name: z.string() })}
          mutationFn={async () => ({
            status: "error",
            formErrors: ["This request is unavailable"],
            fieldErrors: { unrendered: "Contact us about this field" },
          })}
          onSubmit={({ data, mutation }) => mutation.mutate(data)}
        >
          <InputField name="name" label="Name" />
        </Form>,
      );
    });

    await act(async () => container.querySelector("form")!.requestSubmit());
    await vi.waitFor(() =>
      expect(container.textContent).toContain("This request is unavailable"),
    );
    expect(container.textContent).toContain("Contact us about this field");
    expect(container.textContent).not.toContain("View error");
    act(() => root.unmount());
  });
});
