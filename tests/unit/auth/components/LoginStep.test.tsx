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
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { logoutUser, setUserInfo } from "@kenstack/auth/useUserInfo";

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

  it.each(["authenticated", "proven"])(
    "skips the step but retains its controller when auth state is %s",
    async (state) => {
      mocks.loadPublicAuthState.mockResolvedValue({ state });

      expect(await createLoginStep()).toMatchObject({
        skipped: true,
        controller: expect.anything(),
      });
    },
  );

  it.each(["anonymous", "code-sent"])(
    "includes the step by default when auth state is %s",
    async (state) => {
      mocks.loadPublicAuthState.mockResolvedValue({ state });

      expect(await createLoginStep()).toMatchObject({ title: "Sign in" });
    },
  );

  it.each(["anonymous", "code-sent", "authenticated", "proven"])(
    "always includes the step when auth state is %s and always is true",
    async (state) => {
      mocks.loadPublicAuthState.mockResolvedValue({ state });

      expect(
        await createLoginStep({ always: true, title: "Your account" }),
      ).toMatchObject({ title: "Your account" });
    },
  );

  it("uses the base URL only when its composition opts in", async () => {
    mocks.loadPublicAuthState.mockResolvedValue({ state: "anonymous" });
    expect(await createLoginStep()).not.toHaveProperty("index", true);
    expect(await createLoginStep({ index: true })).toHaveProperty(
      "index",
      true,
    );
  });

  it("returns to a skipped login step when identity is lost, without trusting old completion", async () => {
    const authState = { state: "proven", email: "patron@example.com" } as const;
    mocks.loadPublicAuthState.mockResolvedValue(authState);
    setUserInfo(authState);
    window.localStorage.setItem(
      "stored-state:%2Fflow:$completedSteps",
      JSON.stringify({ value: { signin: true } }),
    );
    window.localStorage.setItem(
      "stored-state:%2Fflow:$expiresAt",
      String(Date.now() + 60_000),
    );
    const flow = await StepFlow({
      basePath: "/flow",
      params: Promise.resolve({ step: "details" }),
      steps: {
        signin: {
          ...(await createLoginStep()),
          content: <p>Sign in again</p>,
          title: "Sign in",
        },
        details: { content: <p>Enter your details</p>, title: "Details" },
      },
    });
    await act(async () => root.render(<StrictMode>{flow}</StrictMode>));
    expect(container.querySelector("h2")?.textContent).toBe("Details");
    await act(async () => setUserInfo({ state: "anonymous" }));
    expect(container.querySelector("h2")?.textContent).toBe("Sign in");
    expect(window.location.pathname).toBe("/flow/signin");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("waits for server-confirmed identity before skipping login", async () => {
    const renderFlow = async () =>
      StepFlow({
        basePath: "/flow",
        params: Promise.resolve({ step: "signin" }),
        steps: {
          signin: {
            ...(await createLoginStep()),
            content: <p>Sign in</p>,
            title: "Sign in",
          },
          details: { content: <p>Enter your details</p>, title: "Details" },
        },
      });
    await act(async () => root.render(await renderFlow()));
    expect(mocks.refresh).not.toHaveBeenCalled();
    await act(async () =>
      setUserInfo({ state: "proven", email: "patron@example.com" }),
    );
    expect(container.querySelector("h2")?.textContent).toBe("Sign in");
    expect(mocks.refresh).not.toHaveBeenCalled();
    mocks.loadPublicAuthState.mockResolvedValue({
      state: "proven",
      email: "patron@example.com",
    });
    await act(async () => root.render(await renderFlow()));
    expect(container.querySelector("h2")?.textContent).toBe("Details");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each(["success", "error"])(
    "requires sign-in immediately and restores identity if logout fails (%s)",
    async (status) => {
      const authState = {
        state: "proven",
        email: "patron@example.com",
      } as const;
      mocks.loadPublicAuthState.mockResolvedValue(authState);
      setUserInfo(authState);
      const flow = await StepFlow({
        basePath: "/flow",
        params: Promise.resolve({ step: "details" }),
        steps: {
          signin: {
            ...(await createLoginStep()),
            content: <p>Sign in again</p>,
            title: "Sign in",
          },
          details: { content: <p>Enter your details</p>, title: "Details" },
        },
      });
      await act(async () => root.render(flow));
      const response = Promise.withResolvers<Record<string, unknown>>();
      mocks.fetcher.mockReturnValueOnce(response.promise);
      let logout: Promise<void>;
      await act(async () => {
        logout = logoutUser();
      });
      const refreshesWhilePending = mocks.refresh.mock.calls.length;
      const headingWhilePending = container.querySelector("h2")?.textContent;
      await act(async () => {
        response.resolve({ status, authState: { state: "anonymous" } });
        if (status === "success") {
          await logout;
        } else {
          await expect(logout).rejects.toThrow("Unable to log out.");
        }
      });
      expect(refreshesWhilePending).toBe(0);
      expect(headingWhilePending).toBe("Sign in");
      expect(container.querySelector("h2")?.textContent).toBe(
        status === "success" ? "Sign in" : "Details",
      );
      expect(mocks.refresh).not.toHaveBeenCalled();
    },
  );

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

    await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.fetcher).toHaveBeenCalledOnce();
    expect(mocks.refresh).toHaveBeenCalledOnce();
    expect(container.querySelector("h2")?.textContent).toBe("Sign in");

    mocks.loadPublicAuthState.mockResolvedValue({
      email: "patron@example.com",
      state: "authenticated",
    });
    await act(async () => {
      root.render(<StrictMode>{await flow()}</StrictMode>);
    });
    expect(container.textContent).toContain("All done");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it.each([false, true])(
    "resumes payment after re-login without recording login completion (server refreshed during lapse: %s)",
    async (refreshDuringLapse) => {
      const authState = {
        state: "authenticated",
        email: "patron@example.com",
        userId: 1,
        avatar: null,
        givenName: "Patron",
        familyName: "Example",
        name: "Patron Example",
        initials: "PE",
        roles: [],
      } satisfies PublicAuthState;
      mocks.loadPublicAuthState.mockResolvedValue(authState);
      setUserInfo(authState);
      window.history.replaceState(null, "", "/flow/payment");
      window.localStorage.setItem(
        "stored-state:%2Fflow:$completedSteps",
        JSON.stringify({ value: { details: true } }),
      );
      window.localStorage.setItem(
        "stored-state:%2Fflow:$expiresAt",
        String(Date.now() + 60_000),
      );
      const flow = async (step: string) =>
        StepFlow({
          basePath: "/flow",
          params: Promise.resolve({ step }),
          steps: {
            signin: {
              ...(await createLoginStep()),
              content: <StepLoginForm method="password" />,
              title: "Sign in",
            },
            details: { content: <p>Details</p>, title: "Details" },
            payment: { content: <p>Payment</p>, title: "Payment" },
          },
        });
      await act(async () => root.render(await flow("payment")));
      expect(container.querySelector("h2")?.textContent).toBe("Payment");
      await act(async () => setUserInfo({ state: "anonymous" }));
      expect(container.querySelector("h2")?.textContent).toBe("Sign in");

      if (refreshDuringLapse) {
        mocks.loadPublicAuthState.mockResolvedValue({ state: "anonymous" });
        await act(async () => root.render(await flow("signin")));
      }

      mocks.fetcher.mockResolvedValue({
        status: "success",
        authenticated: true,
        authState,
        path: "/flow/signin",
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
      await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
      expect(
        JSON.parse(
          window.localStorage.getItem("stored-state:%2Fflow:$completedSteps")!,
        ),
      ).toEqual({ value: { details: true } });

      if (refreshDuringLapse) {
        expect(container.querySelector("h2")?.textContent).toBe("Sign in");
        mocks.loadPublicAuthState.mockResolvedValue(authState);
        await act(async () => root.render(await flow("signin")));
      }

      expect(container.querySelector("h2")?.textContent).toBe("Payment");
      expect(window.location.pathname).toBe("/flow/payment");
    },
  );

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
