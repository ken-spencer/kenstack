/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

import Form from "@kenstack/forms/Form";

const mocks = vi.hoisted(() => ({
  execute:
    vi.fn<(siteKey: string, options: { action: string }) => Promise<string>>(),
  fetch: vi.fn<(input: RequestInfo, init?: RequestInit) => Promise<Response>>(
    async () =>
      new Response(JSON.stringify({ status: "success" }), {
        headers: { "Content-Type": "application/json" },
      }),
  ),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// The status outlet scrolls itself into view; jsdom has no layout.
Element.prototype.scrollIntoView = () => {};

function renderForm() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <Form
        apiPath="/api/contact"
        defaultValues={{ name: "Ada" }}
        recaptchaAction="contact"
        schema={z.object({ name: z.string() })}
        onSubmit={({ data, mutation }) => {
          mutation.mutate(data);
        }}
      >
        <button type="submit">Send</button>
      </Form>,
    );
  });

  return {
    container,
    submit: () =>
      act(async () => {
        container.querySelector("form")?.requestSubmit();
      }),
    unmount: () => act(() => root.unmount()),
  };
}

describe("Form recaptchaAction", () => {
  beforeEach(() => {
    mocks.execute.mockReset();
    mocks.fetch.mockClear();
    vi.stubEnv("NEXT_PUBLIC_RECAPTCHA_SITE_KEY", "site-key");
    vi.stubGlobal("fetch", mocks.fetch);
    window.grecaptcha = {
      ready: (callback) => callback(),
      execute: mocks.execute,
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    delete window.grecaptcha;
  });

  it("sends the token requested under the action with the submission", async () => {
    mocks.execute.mockResolvedValue("token-123");
    const { submit, unmount } = renderForm();

    await submit();
    await vi.waitFor(() => expect(mocks.fetch).toHaveBeenCalledOnce());

    expect(mocks.execute).toHaveBeenCalledWith("site-key", {
      action: "contact",
    });
    expect(JSON.parse(String(mocks.fetch.mock.calls[0][1]?.body))).toEqual({
      name: "Ada",
      recaptchaToken: "token-123",
    });
    unmount();
  });

  it("reports a failed token request instead of submitting", async () => {
    mocks.execute.mockRejectedValue(new Error("script blocked"));
    const { container, submit, unmount } = renderForm();

    await submit();
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')).not.toBeNull(),
    );

    expect(mocks.fetch).not.toHaveBeenCalled();
    unmount();
  });
});
