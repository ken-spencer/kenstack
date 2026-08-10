import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({
  useForm: vi.fn(),
  useFormContext: vi.fn(),
}));

vi.mock("@kenstack/forms/context", () => ({ useForm: hooks.useForm }));
vi.mock("react-hook-form", () => ({
  useFormContext: hooks.useFormContext,
}));

import SubmitButton from "@kenstack/forms/Submit";

describe("SubmitButton", () => {
  beforeEach(() => {
    hooks.useForm.mockReturnValue({
      mutation: { isPending: false },
      uploadingFields: new Set(),
    });
    hooks.useFormContext.mockReturnValue({
      formState: {
        isDirty: false,
        isReady: true,
        isSubmitting: false,
      },
    });
  });

  it("honors a caller-supplied pending state", () => {
    const markup = renderToStaticMarkup(
      <SubmitButton isPending>Save changes</SubmitButton>,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain("animate-spin");
    expect(markup).toContain("Save changes");
  });
});
