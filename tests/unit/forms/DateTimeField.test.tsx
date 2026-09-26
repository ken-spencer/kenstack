/** @vitest-environment jsdom */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { useForm, useWatch, FormProvider } from "react-hook-form";
import { expect, it, vi } from "vitest";
import DateTimeField from "@kenstack/forms/DateTimeField";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Editor() {
  const form = useForm({
    defaultValues: { scheduledAt: "2026-09-02T03:30:00.000Z" },
  });
  const scheduledAt = useWatch({ control: form.control, name: "scheduledAt" });
  return (
    <FormProvider {...form}>
      <DateTimeField name="scheduledAt" label="Schedule" />
      <output>{scheduledAt}</output>
    </FormProvider>
  );
}

it("shows and edits venue wall time while retaining UTC transport", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-02T03:30:00.000Z"));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<Editor />));
  try {
    const input = container.querySelector("input")!;
    expect(input.value).toBe("September 1, 2026 at 8:30 PM");
    for (const [text, instant] of [
      ["now", "2026-09-02T03:30:00.000Z"],
      ["in 2 hours", "2026-09-02T05:30:00.000Z"],
      ["tomorrow at 8:30 PM", "2026-09-03T03:30:00.000Z"],
      ["January 15, 2026 at 8:30 PM", "2026-01-16T04:30:00.000Z"],
      ["July 15, 2026 at 8:30 PM", "2026-07-16T03:30:00.000Z"],
      ["July 15, 2026 at 8:30 PM GMT", "2026-07-15T20:30:00.000Z"],
    ]) {
      act(() => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, text);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () =>
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        ),
      );
      expect(container.querySelector("output")!.textContent).toBe(instant);
    }
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  }
});
