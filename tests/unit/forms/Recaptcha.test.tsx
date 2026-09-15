/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as z from "zod";

const mocks = vi.hoisted(() => ({
  executeRecaptcha: vi.fn<(action: string) => Promise<string>>(),
  fetcher: vi.fn(async () => ({ status: "success" as const })),
}));

vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: mocks.executeRecaptcha }),
}));

import Form from "@kenstack/forms/Form";

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
    mocks.executeRecaptcha.mockReset();
    mocks.fetcher.mockClear();
  });

  it("sends the token requested under the action with the submission", async () => {
    mocks.executeRecaptcha.mockResolvedValue("token-123");
    const { submit, unmount } = renderForm();

    await submit();
    await vi.waitFor(() => expect(mocks.fetcher).toHaveBeenCalledOnce());

    expect(mocks.executeRecaptcha).toHaveBeenCalledWith("contact");
    expect(mocks.fetcher).toHaveBeenCalledWith("/api/contact", {
      name: "Ada",
      recaptchaToken: "token-123",
    });
    unmount();
  });

  it("reports a failed token request instead of submitting", async () => {
    mocks.executeRecaptcha.mockRejectedValue(new Error("script blocked"));
    const { container, submit, unmount } = renderForm();

    await submit();
    await vi.waitFor(() =>
      expect(container.textContent).toContain("reCAPTCHA didn’t complete"),
    );

    expect(mocks.fetcher).not.toHaveBeenCalled();
    unmount();
  });
});
