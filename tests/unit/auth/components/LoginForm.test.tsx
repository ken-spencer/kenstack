/** @vitest-environment jsdom */

import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  refresh: vi.fn(),
  setUserInfo: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("@kenstack/auth/useUserInfo", () => ({
  setUserInfo: mocks.setUserInfo,
}));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));

import LoginForm from "@kenstack/auth/components/Login/Form";

const inputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)?.set;

function setInputValue(input: HTMLInputElement | null, value: string) {
  inputValueSetter?.call(input, value);
  input?.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("LoginForm", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Element.prototype.scrollIntoView = vi.fn();
    mocks.fetcher.mockResolvedValue({
      authenticated: true,
      authState: {
        avatar: null,
        email: "patron@example.com",
        familyName: "Patron",
        givenName: "Civic",
        initials: "CP",
        name: "Civic Patron",
        roles: [],
        state: "authenticated",
        userId: 1,
      },
      path: "/take-your-seat/signin",
      status: "success",
    });
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.clearAllMocks();
  });

  it("keeps verifying after consuming a standalone link token", async () => {
    window.history.replaceState(null, "", `/login?token=${"a".repeat(43)}`);
    const { promise, resolve: settleLink } =
      Promise.withResolvers<Record<string, unknown>>();
    mocks.fetcher.mockReturnValueOnce(promise);

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    await vi.waitFor(() => expect(mocks.fetcher).toHaveBeenCalledOnce());
    expect(window.location.search).toBe("");

    await act(async () => {
      settleLink({
        message: "We couldn’t finish signing you in.",
        status: "error",
      });
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain(
        "We couldn’t finish signing you in.",
      ),
    );

    expect(mocks.fetcher).toHaveBeenCalledWith("/api/auth", {
      action: "verify-email-login-link",
      token: "a".repeat(43),
    });
  });

  it("shows email login after a coded link failure without a URL message round-trip", async () => {
    window.history.replaceState(
      null,
      "",
      `/login?token=${"a".repeat(43)}&returnTo=%2Faccount`,
    );
    mocks.fetcher.mockResolvedValueOnce({
      code: "wrong-browser",
      message: "This link was opened in a different browser.",
      status: "error",
    });

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm method="password" />
        </StrictMode>,
      );
    });

    await vi.waitFor(() =>
      expect(container.querySelector('input[name="email"]')).not.toBeNull(),
    );

    expect(container.querySelector('input[name="password"]')).toBeNull();
    expect(container.textContent).toContain(
      "This link was opened in a different browser.",
    );
    expect(window.location.search).toBe("?returnTo=%2Faccount");
    expect(document.cookie).toContain("loginMethod=email");
    expect(mocks.fetcher).toHaveBeenCalledOnce();
  });

  it("prefills the onboarding email and shows its notice", async () => {
    window.history.replaceState(null, "", "/login");

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    window.history.replaceState(
      null,
      "",
      "/login?email=Patron%40Example.com&notice=onboarding",
    );

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain(
      "Your account is ready. Confirm your email below",
    );
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    expect(emailInput?.value).toBe("patron@example.com");
    expect(window.location.search).toBe("?email=Patron%40Example.com");
    expect(mocks.fetcher).not.toHaveBeenCalled();
  });

  it("resumes a server-loaded email challenge", async () => {
    window.history.replaceState(null, "", "/login");

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm
            challengeKey="6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55"
            email="patron@example.com"
          />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain(
      "We sent an email to patron@example.com",
    );
    expect(container.querySelector('input[name="code"]')).not.toBeNull();
    expect(container.querySelector('input[name="email"]')).toBeNull();
  });

  it("switches login methods without losing the email", async () => {
    window.history.replaceState(null, "", "/login");

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );

    await act(async () => {
      setInputValue(emailInput, "patron@example.com");
    });

    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Use a password instead")
        ?.click(),
    );

    expect(container.querySelector('input[name="password"]')).not.toBeNull();
    expect(
      container.querySelector<HTMLInputElement>('input[name="email"]')?.value,
    ).toBe("patron@example.com");
    await act(async () => {
      container
        .querySelector("form")
        ?.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
    });

    expect(container.textContent).toContain("Password is required");

    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Email me a code instead")
        ?.click(),
    );

    expect(container.querySelector('input[name="password"]')).toBeNull();
    expect(
      container.querySelector<HTMLInputElement>('input[name="email"]')?.value,
    ).toBe("patron@example.com");
    expect(container.textContent).toContain("Use a password instead");
    expect(document.cookie).toContain("loginMethod=email");
  });

  it("shows a redirected login message and removes it from the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/login?loginMessage=Please%20sign%20in&returnTo=%2Faccount",
    );

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain("Please sign in");
    expect(window.location.search).toBe("?returnTo=%2Faccount");

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain("Please sign in");
  });

  it("requests a standalone email link for its return destination", async () => {
    window.history.replaceState(null, "", "/login?returnTo=%2Faccount");
    mocks.fetcher.mockResolvedValueOnce({
      authState: { email: "patron@example.com", state: "code-sent" },
      challengeKey: "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55",
      status: "success",
    });

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    await act(async () => {
      setInputValue(emailInput, "patron@example.com");
      emailInput?.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    await vi.waitFor(() =>
      expect(container.textContent).toContain("We sent an email"),
    );
    expect(mocks.fetcher).toHaveBeenCalledWith("/api/auth", {
      action: "email-login",
      email: "patron@example.com",
      linkToReturnTo: undefined,
      recaptchaToken: null,
      returnTo: "/account",
    });
  });

  it("shows the code page optimistically and reverts when the send fails", async () => {
    window.history.replaceState(null, "", "/take-your-seat/signin");
    const { promise, resolve: settleSend } =
      Promise.withResolvers<Record<string, unknown>>();
    mocks.fetcher.mockReturnValueOnce(promise);

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    await act(async () => {
      setInputValue(emailInput, "patron@example.com");
      emailInput?.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    // The code page shows before the send settles, with resend and
    // verification unavailable.
    expect(container.textContent).toContain("Sending an email");
    const buttons = Array.from(container.querySelectorAll("button"));
    expect(
      buttons.find((button) => button.textContent?.includes("Resend email"))
        ?.disabled,
    ).toBe(true);
    expect(
      buttons.find((button) => button.textContent === "Continue")?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLInputElement>('input[name="code"]')?.disabled,
    ).toBe(true);

    await act(async () => {
      settleSend({
        message: "Wait a moment before requesting another email.",
        status: "error",
      });
    });

    expect(container.textContent).not.toContain("We sent an email");
    expect(container.textContent).toContain(
      "Wait a moment before requesting another email.",
    );
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
  });

  it("ignores a resend that settles after choosing a different email", async () => {
    window.history.replaceState(null, "", "/take-your-seat/signin");
    const { promise: resendPromise, resolve: settleResend } =
      Promise.withResolvers<Record<string, unknown>>();
    mocks.fetcher
      .mockResolvedValueOnce({
        authState: { email: "patron@example.com", state: "code-sent" },
        challengeKey: "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55",
        status: "success",
      })
      .mockReturnValueOnce(resendPromise);

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    await act(async () => {
      setInputValue(emailInput, "patron@example.com");
      emailInput?.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain("We sent an email"),
    );

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Resend email"))
        ?.click();
    });
    expect(container.textContent).toContain("Sending an email");
    expect(
      container.querySelector<HTMLInputElement>('input[name="code"]')?.disabled,
    ).toBe(true);

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("different email"))
        ?.click();
    });
    expect(container.querySelector('input[name="email"]')).not.toBeNull();

    await act(async () => {
      settleResend({
        authState: { email: "patron@example.com", state: "code-sent" },
        challengeKey: "3ba9bda9-9f6a-45e5-a258-69ddac7b1044",
        status: "success",
      });
    });

    expect(container.querySelector('input[name="email"]')).not.toBeNull();
    expect(container.textContent).not.toContain("We sent an email");
  });

  it("keeps a link failure message while switching login methods", async () => {
    window.history.replaceState(
      null,
      "",
      "/login?returnTo=%2Ftake-your-seat%2Fsignin&loginMessage=This%20link%20was%20opened%20in%20a%20different%20browser.",
    );

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain(
      "This link was opened in a different browser.",
    );

    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent === "Use a password instead")
        ?.click(),
    );

    expect(container.querySelector('input[name="password"]')).not.toBeNull();
    expect(window.location.search).toBe("?returnTo=%2Ftake-your-seat%2Fsignin");
    expect(mocks.fetcher).not.toHaveBeenCalled();
  });

  it("keeps an in-progress challenge after cleaning a link message from the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/login?loginMessage=This%20link%20was%20opened%20in%20a%20different%20browser.",
    );
    mocks.fetcher.mockResolvedValueOnce({
      authState: { email: "patron@example.com", state: "code-sent" },
      challengeKey: "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55",
      status: "success",
    });

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    expect(emailInput).not.toBeNull();
    expect(inputValueSetter).toBeDefined();

    await act(async () => {
      setInputValue(emailInput, "patron@example.com");
      emailInput?.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    await vi.waitFor(() =>
      expect(container.textContent).toContain("We sent an email"),
    );
    expect(window.location.search).toBe("");

    await act(async () => {
      root.render(
        <StrictMode>
          <LoginForm />
        </StrictMode>,
      );
    });

    expect(container.textContent).toContain("We sent an email");
    expect(container.querySelector('input[name="code"]')).not.toBeNull();
  });
});
