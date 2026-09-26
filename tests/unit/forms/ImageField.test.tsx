/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import * as z from "zod";

const mocks = vi.hoisted(() => ({ fetcher: vi.fn() }));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));

import Form from "@kenstack/forms/Form";
import ImageField from "@kenstack/forms/ImageField";
import Submit from "@kenstack/forms/Submit";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
// jsdom has no layout; the blocked-submission notice scrolls itself into view.
Element.prototype.scrollIntoView = vi.fn();

it("keeps Submit disabled and blocks submission until an upload completes", async () => {
  const uploaded = Promise.withResolvers<{
    status: "success";
    imageId: string;
    url: string;
    width: number;
    height: number;
  }>();
  mocks.fetcher.mockImplementation(async (_path, data) =>
    data.action === "upload-complete"
      ? uploaded.promise
      : {
          status: "success",
          id: "image-upload",
          uploadUrl: "https://upload.test/image",
        },
  );
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
  );
  const onSubmit = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <Form
        defaultValues={{ image: null }}
        schema={z.object({ image: z.unknown() })}
        onSubmit={onSubmit}
      >
        <ImageField
          name="image"
          label="Image"
          apiPath="/api/test"
          presignedUrlAction="upload"
          uploadCompleteAction="upload-complete"
        />
        <Submit />
      </Form>,
    ),
  );
  const form = container.querySelector("form")!;
  const submit = () => act(async () => form.requestSubmit());
  const input =
    container.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", {
    configurable: true,
    value: [new File(["image"], "image.png", { type: "image/png" })],
  });
  await act(async () =>
    input.dispatchEvent(new Event("change", { bubbles: true })),
  );
  await vi.waitFor(() =>
    expect(
      mocks.fetcher.mock.calls.some(
        ([, data]) => data.action === "upload-complete",
      ),
    ).toBe(true),
  );
  expect(
    form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(true);
  await submit();
  expect(onSubmit).not.toHaveBeenCalled();

  await act(async () =>
    uploaded.resolve({
      status: "success",
      imageId: "image-upload",
      url: "/image.png",
      width: 100,
      height: 100,
    }),
  );
  await vi.waitFor(() =>
    expect(
      form.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
    ).toBe(false),
  );
  await submit();
  await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
