/** @vitest-environment jsdom */

import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as z from "zod";

import { FormProvider, useForm } from "@kenstack/forms/context";

describe("FormProvider", () => {
  it("provides the query client required by its mutation", () => {
    expect(() =>
      renderToStaticMarkup(
        <FormProvider
          defaultValues={{ name: "" }}
          schema={z.object({ name: z.string() })}
        >
          <span>Form content</span>
        </FormProvider>,
      ),
    ).not.toThrow();
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
