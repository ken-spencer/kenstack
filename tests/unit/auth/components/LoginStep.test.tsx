/** @vitest-environment jsdom */

import { act, StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  loadPublicAuthState: vi.fn(),
  refresh: vi.fn(),
}));
// Next's router keeps one identity across renders.
const router = vi.hoisted(() => ({ refresh: mocks.refresh }));

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/auth/server/state", () => ({
  loadPublicAuthState: mocks.loadPublicAuthState,
}));
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
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));

import StepFlow from "@kenstack/components/StepFlow";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import { createLoginStep } from "@kenstack/auth/components/Login/Step";
import StepLoginForm from "@kenstack/auth/components/Login/Step/Form";
import { setUserInfo } from "@kenstack/auth/useUserInfo";

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
        title: "Sign in",
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
        title: "Sign in",
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
        title: "Your account",
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
    window.localStorage.clear();
    setUserInfo({ state: "anonymous" });
    mocks.loadPublicAuthState
      .mockReset()
      .mockResolvedValue({ state: "anonymous" });
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

  it.each(["anonymous", "code-sent"])(
    "does not skip the step when auth state is %s",
    async (state) => {
      mocks.loadPublicAuthState.mockResolvedValue({ state });

      expect((await createLoginStep()).skipped).toBeUndefined();
    },
  );

  it.each(["authenticated", "proven"])(
    "starts skipped when auth state is %s",
    async (state) => {
      mocks.loadPublicAuthState.mockResolvedValue({ state });

      expect((await createLoginStep()).skipped).toBe(true);
    },
  );

  it("brings a skipped login step forward when identity is lost and skips it again on sign-in", async () => {
    const authState = { state: "proven", email: "patron@example.com" } as const;
    mocks.loadPublicAuthState.mockResolvedValue(authState);
    setUserInfo(authState);
    const flow = await StepFlow({
      basePath: "/flow",
      steps: {
        signin: {
          ...(await createLoginStep()),
          content: <p>Sign in again</p>,
          title: "Sign in",
        },
        details: {
          content: (
            <>
              <p>Enter your details</p>
              <StepActions next="Continue" />
            </>
          ),
          title: "Details",
        },
        payment: { content: <p>Payment</p>, title: "Payment" },
      },
    });
    await act(async () => root.render(<StrictMode>{flow}</StrictMode>));
    expect(container.querySelector("h2")?.textContent).toBe("Details");
    await act(async () => {
      [...container.querySelectorAll<HTMLButtonElement>("button.next")]
        .at(-1)
        ?.click();
    });
    expect(container.querySelector("h2")?.textContent).toBe("Payment");

    // Signed out elsewhere: the step comes forward in place of Payment.
    await act(async () => setUserInfo({ state: "anonymous" }));
    expect(container.querySelector("h2")?.textContent).toBe("Sign in");

    // Signed in again: the step skips and the flow resumes where it was.
    await act(async () => setUserInfo(authState));
    expect(container.querySelector("h2")?.textContent).toBe("Payment");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("advances after an embedded password login from the returned auth state", async () => {
    window.history.replaceState(null, "", "/flow/signin");
    mocks.fetcher.mockResolvedValueOnce({
      authenticated: true,
      authState: {
        email: "patron@example.com",
        name: "Patron Example",
        state: "authenticated",
      },
      path: "/flow",
      status: "success",
    });
    const flow = async () =>
      StepFlow({
        basePath: "/flow",
        steps: {
          signin: {
            ...(await createLoginStep()),
            title: "Sign in",
            content: <StepLoginForm method="password" />,
          },
          done: { content: <p>All done</p>, title: "Done" },
        },
      });

    await act(async () => {
      root.render(<StrictMode>{await flow()}</StrictMode>);
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

    await vi.waitFor(() =>
      expect(container.querySelector("h2")?.textContent).toBe("Done"),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("verifies the link once on the flow page and advances on success", async () => {
    window.history.replaceState(null, "", `/flow?token=${token}`);
    mocks.fetcher.mockResolvedValue({
      authState: { state: "authenticated" },
      path: "/flow",
      status: "success",
    });
    const flow = await LoginFlow();

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    await vi.waitFor(() =>
      expect(container.querySelector("h2")?.textContent).toBe("Done"),
    );

    expect(mocks.fetcher).toHaveBeenCalledOnce();
    expect(mocks.fetcher).toHaveBeenCalledWith("/api/auth", {
      action: "verify-email-login-link",
      returnTo: "/flow#steps",
      token,
    });
    expect(window.location.search).toBe("");
  });

  it("advances enrollment after proving an unregistered email", async () => {
    window.history.replaceState(null, "", `/flow?token=${token}`);
    mocks.fetcher.mockResolvedValue({
      authState: { email: "patron@example.com", state: "proven" },
      path: "/flow",
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
    window.history.replaceState(null, "", `/flow?token=${token}`);
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
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        linkFailureMessage,
      ),
    );
    expect(container.querySelector('input[name="email"]')).not.toBeNull();
    expect(window.location.search).toBe("");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("brings a controlled sign-in step forward to verify a link opened on another step", async () => {
    window.history.replaceState(null, "", `/flow?token=${token}`);
    window.localStorage.setItem(
      "stored-state:%2Fflow:$completedSteps",
      JSON.stringify({ value: { first: true } }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );
    mocks.loadPublicAuthState.mockResolvedValue({ state: "anonymous" });
    mocks.fetcher.mockResolvedValue({
      authState: { state: "authenticated" },
      path: "/flow",
      status: "success",
    });
    const flow = await StepFlow({
      basePath: "/flow",
      steps: {
        first: { content: <p>Pick something</p>, title: "First" },
        signin: {
          ...(await createLoginStep()),
          content: <StepLoginForm />,
          title: "Sign in",
        },
        done: { content: <p>All done</p>, title: "Done" },
      },
    });

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    await vi.waitFor(() =>
      expect(container.querySelector("h2")?.textContent).toBe("Done"),
    );
    expect(mocks.fetcher).toHaveBeenCalledOnce();
    expect(mocks.fetcher).toHaveBeenCalledWith("/api/auth", {
      action: "verify-email-login-link",
      returnTo: "/flow#steps",
      token,
    });
    expect(window.location.search).toBe("");
  });

  it("releases Back once a pending link's sign-in step has been shown", async () => {
    window.history.replaceState(null, "", `/flow?token=${token}`);
    mocks.loadPublicAuthState.mockResolvedValue({ state: "anonymous" });
    mocks.fetcher.mockResolvedValue({
      code: "expired",
      message: linkFailureMessage,
      status: "error",
    });
    const flow = await StepFlow({
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
          ...(await createLoginStep()),
          content: <StepLoginForm />,
          title: "Sign in",
        },
      },
    });

    await act(async () => {
      root.render(<StrictMode>{flow}</StrictMode>);
    });

    // A fresh browser has no completed steps, so the link waits on step one.
    expect(container.querySelector("h2")?.textContent).toBe("First");
    await act(async () => {
      container.querySelector<HTMLButtonElement>("button.next")?.click();
    });
    expect(container.querySelector("h2")?.textContent).toBe("Sign in");
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        linkFailureMessage,
      ),
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>("button.back")?.click();
    });
    expect(container.querySelector("h2")?.textContent).toBe("First");
  });

  it("returns a failed link to the email form with its message", async () => {
    window.history.replaceState(null, "", `/flow?token=${token}`);
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
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        linkFailureMessage,
      ),
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
      expect(container.querySelector('input[name="code"]')).not.toBeNull(),
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
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
    window.history.replaceState(null, "", `/flow?token=${token}`);

    await act(async () => {
      root.render(<StrictMode>{await LoginFlow()}</StrictMode>);
    });
    await vi.waitFor(() =>
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        linkFailureMessage,
      ),
    );

    window.history.replaceState(null, "", `/flow?token=${nextToken}`);
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
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        nextFailureMessage,
      ),
    );
    expect(
      container.querySelector('[role="alert"]')?.textContent,
    ).not.toContain(linkFailureMessage);
    expect(window.location.search).toBe("");
  });
});
