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

async function LoginFlow() {
  return StepFlow({
    basePath: "/flow",
    steps: {
      signin: {
        ...(await createLoginStep()),
        title: "Sign in",
        content: <StepLoginForm />,
      },
      done: { content: <p>All done</p>, title: "Done" },
    },
  });
}

async function EnrollmentFlow() {
  return StepFlow({
    basePath: "/flow",
    steps: {
      account: {
        ...(await createLoginStep()),
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
    window.sessionStorage.clear();
    setUserInfo({ state: "anonymous" });
    mocks.loadPublicAuthState
      .mockReset()
      .mockResolvedValue({ state: "anonymous" });
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    Element.prototype.scrollIntoView = vi.fn();
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
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

  it("reports a failed link, then shows the email form once closed", async () => {
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
      expect(document.body.querySelector("dialog")?.textContent).toContain(
        linkFailureMessage,
      ),
    );
    // The link settles when its dialog closes.
    expect(window.location.search).toBe(`?token=${token}`);
    await act(async () => {
      document.body
        .querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')
        ?.click();
    });
    await vi.waitFor(() => expect(window.location.search).toBe(""));

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
});
