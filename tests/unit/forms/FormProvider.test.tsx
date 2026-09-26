/** @vitest-environment jsdom */

import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";

import { FormProvider, useForm } from "@kenstack/forms/context";
import Form from "@kenstack/forms/Form";
import InputField from "@kenstack/forms/InputField";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// The status outlet scrolls itself into view; jsdom has no layout.
Element.prototype.scrollIntoView = () => {};

describe("FormProvider", () => {
  it.each([
    ["", "Guest count is required"],
    ["abc", "Enter a whole number of guests"],
    ["0", "Enter at least 1 guest"],
    ["301", "Enter no more than 300 guests"],
    ["12", undefined],
  ])(
    "shows only the first failed rule for guest count %j",
    async (value, message) => {
      const container = document.createElement("div");
      const root = createRoot(container);
      const onSubmit = vi.fn();

      act(() => {
        root.render(
          <Form
            defaultValues={{ guestCount: value }}
            schema={z.object({
              guestCount: z
                .string()
                .trim()
                .min(1, "Guest count is required")
                .refine(
                  (value) => /^\d+$/.test(value),
                  "Enter a whole number of guests",
                )
                .refine((value) => Number(value) >= 1, "Enter at least 1 guest")
                .refine(
                  (value) => Number(value) <= 300,
                  "Enter no more than 300 guests",
                ),
            })}
            onSubmit={onSubmit}
          >
            <InputField name="guestCount" label="Guests" />
          </Form>,
        );
      });

      await act(async () => {
        container.querySelector("form")!.requestSubmit();
      });

      expect(
        Array.from(
          container.querySelectorAll('[data-slot="form-message"]'),
          (element) => element.textContent,
        ),
      ).toEqual(message ? [message] : []);
      expect(onSubmit).toHaveBeenCalledTimes(message ? 0 : 1);
      act(() => root.unmount());
    },
  );

  it("shows one server error per field while keeping separate field and form errors", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Form
          defaultValues={{ guestCount: "", email: "" }}
          schema={z.object({ guestCount: z.string(), email: z.string() })}
          mutationFn={async () => ({
            status: "error" as const,
            fieldErrors: {
              guestCount: ["Guest count is required", "Enter at least 1 guest"],
              email: "Enter your email",
              "address.city": ["Enter a city", "City is too short"],
            },
            formErrors: [
              "The selected time is unavailable",
              "Choose another room",
            ],
          })}
          onSubmit={({ data, mutation }) => mutation.mutate(data)}
        >
          <InputField name="guestCount" label="Guests" />
          <InputField name="email" label="Email" />
        </Form>,
      );
    });

    await act(async () => {
      container.querySelector("form")!.requestSubmit();
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain("Enter your email"),
    );

    expect(
      Array.from(
        container.querySelectorAll('[data-slot="form-message"]'),
        (element) => element.textContent,
      ),
    ).toEqual(["Guest count is required", "Enter your email"]);
    expect(container.textContent).toContain("Enter a city");
    expect(container.textContent).not.toContain("City is too short");
    expect(container.textContent).toContain("The selected time is unavailable");
    expect(container.textContent).toContain("Choose another room");
    act(() => root.unmount());
  });

  it("keeps its initial status through Strict Mode effect replay", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <StrictMode>
          <FormProvider
            defaultValues={{ name: "" }}
            initialStatusMessage={{
              message: "This sign-in link has expired.",
              status: "error",
            }}
            schema={z.object({ name: z.string() })}
          >
            <StatusMessage />
          </FormProvider>
        </StrictMode>,
      );
    });

    expect(container.textContent).toBe("This sign-in link has expired.");
    act(() => root.unmount());
  });
});

function StatusMessage() {
  return <>{useForm().statusMessage?.message}</>;
}
