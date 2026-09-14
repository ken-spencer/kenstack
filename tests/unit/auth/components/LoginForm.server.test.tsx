import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  useSearchParams: () =>
    new URLSearchParams(`token=${"a".repeat(43)}&returnTo=%2Faccount`),
}));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));

import LoginForm from "@kenstack/auth/components/Login/Form";

describe("LoginForm server rendering", () => {
  it.each(["standalone", "embedded"])(
    "renders an emailed link before %s verification begins in the browser",
    (mode) => {
      const markup = renderToStaticMarkup(
        mode === "embedded" ? (
          <LoginForm
            anchor="steps"
            entryPath="/flow/signin"
            mode="embedded"
            onComplete={vi.fn()}
          />
        ) : (
          <LoginForm />
        ),
      );

      expect(markup).toContain("Signing you in…");
    },
  );
});
