/** @vitest-environment jsdom */

import { act, StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  refresh: vi.fn(),
}));
// Next's router keeps one identity across renders.
const router = vi.hoisted(() => ({ refresh: mocks.refresh }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () =>
    useSyncExternalStore(
      (notify) => {
        window.addEventListener("next-pathname", notify);
        return () => window.removeEventListener("next-pathname", notify);
      },
      () => window.location.pathname,
      () => "/flow",
    ),
  useRouter: () => router,
  useSearchParams: () => {
    useSyncExternalStore(
      (notify) => {
        window.addEventListener("next-pathname", notify);
        return () => window.removeEventListener("next-pathname", notify);
      },
      () => window.location.search,
      () => "",
    );
    return new URLSearchParams(window.location.search);
  },
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("@kenstack/auth/useUserInfo", () => ({ setUserInfo: vi.fn() }));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));

import StepFlow from "@kenstack/components/StepFlow";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import { createLoginStep } from "@kenstack/auth/components/Login/Step";
import StepLoginForm from "@kenstack/auth/components/Login/Step/Form";

const token = "a".repeat(43);
const linkFailureMessage =
  "This sign-in link has expired. Request a new email to continue.";

const inputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value",
)?.set;

function setInputValue(input: HTMLInputElement | null, value: string) {
  inputValueSetter?.call(input, value);
  input?.dispatchEvent(new Event("input", { bubbles: true }));
}

function LoginFlow() {
  return StepFlow({
    basePath: "/flow",
    steps: {
      signin: {
        ...createLoginStep(),
        content: <StepLoginForm />,
      },
      done: { content: <p>All done</p>, title: "Done" },
    },
  });
}

function LoginLaterFlow() {
  return StepFlow({
    basePath: "/flow",
    steps: {
      first: {
        content: (
          <>
            <p>Pick something</p>
            <StepActions next="Continue" />
          </>
        ),
        title: "First",
      },
      signin: {
        ...createLoginStep(),
        content: <StepLoginForm />,
      },
    },
  });
}

function EnrollmentFlow() {
  return StepFlow({
    basePath: "/flow",
    steps: {
      account: {
        ...createLoginStep({ title: "Your account" }),
        content: <StepLoginForm />,
      },
      details: { content: <p>Enter your details</p>, title: "Your details" },
    },
  });
}

describe("Login step", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Element.prototype.scrollIntoView = vi.fn();
    const replaceState = window.history.replaceState.bind(window.history);
    vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
      replaceState(...args);
      window.dispatchEvent(new Event("next-pathname"));
    });
    container = document.createElement("div");
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("renders the verification submit through the flow action renderer", async () => {
    window.history.replaceState(null, "", "/flow/signin");
    const flow = await StepFlow({
      basePath: "/flow",
      steps: {
        signin: {
          content: (
            <StepLoginForm
              challengeKey="6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55"
              email="patron@example.com"
            />
          ),
          title: "Sign in",
        },
      },
    });

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    const action = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Continue",
    );
    expect(action?.classList).toContain("next");
    expect(action?.closest(".step-actions")).not.toBeNull();
  });

  it("renders the email submit through the flow action renderer", async () => {
    window.history.replaceState(null, "", "/flow/signin");
    const flow = await LoginFlow();

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    const action = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Email me a code",
    );
    expect(action?.classList).toContain("next");
    expect(action?.closest(".step-actions")).not.toBeNull();
  });

  it("advances after an embedded password login from the returned auth state", async () => {
    window.history.replaceState(null, "", "/flow/signin");
    mocks.fetcher.mockResolvedValue({
      authenticated: true,
      authState: { email: "patron@example.com", state: "authenticated" },
      path: "/flow/signin",
      status: "success",
    });
    const flow = await StepFlow({
      basePath: "/flow",
      steps: {
        signin: {
          ...createLoginStep(),
          content: <StepLoginForm method="password" />,
        },
        done: { content: <p>All done</p>, title: "Done" },
      },
    });

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="email"]',
    );
    await act(async () => {
      setInputValue(emailInput, "patron@example.com");
      setInputValue(
        container.querySelector<HTMLInputElement>('input[name="password"]'),
        "Password1",
      );
      emailInput?.form?.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });

    await vi.waitFor(() => expect(container.textContent).toContain("All done"));
    expect(mocks.fetcher).toHaveBeenCalledOnce();
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("verifies the link once on the flow page and advances on success", async () => {
    window.history.replaceState(null, "", `/flow/signin?token=${token}`);
    mocks.fetcher.mockResolvedValue({
      authState: { state: "authenticated" },
      path: "/flow/signin",
      status: "success",
    });
    const flow = await LoginFlow();

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalled());

    expect(mocks.fetcher).toHaveBeenCalledOnce();
    expect(mocks.fetcher).toHaveBeenCalledWith("/api/auth", {
      action: "verify-email-login-link",
      returnTo: "/flow/signin#steps",
      token,
    });
    expect(window.location.search).toBe("");
    expect(container.textContent).toContain("All done");
  });

  it("advances enrollment after proving an unregistered email", async () => {
    window.history.replaceState(null, "", `/flow/account?token=${token}`);
    mocks.fetcher.mockResolvedValue({
      authState: { email: "patron@example.com", state: "proven" },
      path: "/flow/account",
      status: "success",
    });
    const flow = await EnrollmentFlow();

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    await vi.waitFor(() =>
      expect(container.querySelector("h2")?.textContent).toBe("Your details"),
    );
    expect(window.location.search).toBe("");
  });

  it("waits for the sign-in step before verifying a link opened on another step", async () => {
    window.history.replaceState(null, "", `/flow/first?token=${token}`);
    mocks.fetcher.mockResolvedValue({
      code: "expired",
      message: linkFailureMessage,
      status: "error",
    });
    const flow = await LoginLaterFlow();

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    expect(container.textContent).toContain("Pick something");
    expect(mocks.fetcher).not.toHaveBeenCalled();
    expect(new URLSearchParams(window.location.search).get("token")).toBe(
      token,
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button.next")?.click();
    });

    await vi.waitFor(() => expect(mocks.fetcher).toHaveBeenCalledOnce());
    await vi.waitFor(() =>
      expect(container.textContent).toContain(linkFailureMessage),
    );
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
    expect(window.location.search).toBe("");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("returns a failed link to the email form with its message", async () => {
    window.history.replaceState(null, "", `/flow/signin?token=${token}`);
    mocks.fetcher
      .mockResolvedValueOnce({
        code: "expired",
        message: linkFailureMessage,
        status: "error",
      })
      .mockResolvedValueOnce({
        authState: { email: "patron@example.com", state: "code-sent" },
        challengeKey: "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55",
        status: "success",
      });
    const flow = await LoginFlow();

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain(linkFailureMessage),
    );
    expect(window.location.search).toBe("");

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
    expect(container.textContent).not.toContain(linkFailureMessage);
  });

  it("verifies a new token without applying the previous token's result", async () => {
    const nextToken = "b".repeat(43);
    const nextFailureMessage =
      "This sign-in link is no longer valid. Request a new email to continue.";
    const { promise: nextLinkPromise, resolve: settleNextLink } =
      Promise.withResolvers<Record<string, unknown>>();
    mocks.fetcher
      .mockResolvedValueOnce({
        code: "expired",
        message: linkFailureMessage,
        status: "error",
      })
      .mockReturnValueOnce(nextLinkPromise);
    window.history.replaceState(null, "", `/flow/signin?token=${token}`);

    await act(async () => {
      root.render(<StrictMode>{await LoginFlow()}</StrictMode>);
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain(linkFailureMessage),
    );

    window.history.replaceState(null, "", `/flow/signin?token=${nextToken}`);
    await act(async () => {
      root.render(<StrictMode>{await LoginFlow()}</StrictMode>);
    });

    await vi.waitFor(() => expect(mocks.fetcher).toHaveBeenCalledTimes(2));
    expect(new URLSearchParams(window.location.search).get("token")).toBeNull();

    await act(async () => {
      settleNextLink({
        code: "invalid",
        message: nextFailureMessage,
        status: "error",
      });
    });
    await vi.waitFor(() =>
      expect(container.textContent).toContain(nextFailureMessage),
    );
    expect(container.textContent).not.toContain(linkFailureMessage);
    expect(window.location.search).toBe("");
  });
});
