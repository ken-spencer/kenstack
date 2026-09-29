/** @vitest-environment jsdom */

import { act, isValidElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  fetcher: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@kenstack/auth/server/getUsersModule", () => ({
  getUsersModule: () => ({ passwordPath: "/account/password" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
  redirect: () => {
    throw new Error("Unexpected login redirect");
  },
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentSession: mocks.session,
}));
vi.mock("@kenstack/auth/server/state", () => ({
  loadAuthState: async () => ({
    userId: 1,
    state: "authenticated",
    email: "patron@example.com",
  }),
}));
vi.mock("@kenstack/auth/components/Login/loadFormProps", () => ({
  loadLoginFormProps: async () => ({ method: "password" }),
}));
vi.mock("@kenstack/api/fetcher", () => ({ default: mocks.fetcher }));
vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: undefined }),
}));

import ResetPasswordFormLoader from "@kenstack/auth/components/ResetPassword/Loader";

// Resolves the async server components at the top of the tree, as the server
// renderer does before the client receives it.
async function resolveServer(node: ReactNode): Promise<ReactNode> {
  if (
    isValidElement(node) &&
    typeof node.type === "function" &&
    node.type.constructor.name === "AsyncFunction"
  )
    return resolveServer(
      await (node.type as (props: unknown) => Promise<ReactNode>)(node.props),
    );
  return node;
}

async function renderLoader() {
  const tree = await resolveServer(await ResetPasswordFormLoader());
  await act(async () => root.render(tree));
}

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Element.prototype.scrollIntoView = vi.fn();
  container = document.createElement("div");
  root = createRoot(container);
  mocks.session.mockResolvedValue({
    id: 1,
    expiresAt: new Date(Date.now() + 86400_000),
    authorizedUntil: new Date(Date.now() + 600_000),
    createdAt: new Date(),
    userId: 1,
    impersonatedBy: null,
  });
});
afterEach(() => {
  act(() => root.unmount());
  vi.clearAllMocks();
});

it("preserves the password change confirmation when its rotated session refreshes the page", async () => {
  mocks.fetcher.mockResolvedValue({
    status: "success",
    message: "Your password has successfully been set.",
  });
  await renderLoader();
  await act(async () => {
    for (const input of container.querySelectorAll<HTMLInputElement>(
      'input[type="password"]',
    )) {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "Replacement123");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await act(async () => {
    container
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledOnce());
  expect(container.textContent).toContain(
    "Your password has successfully been set.",
  );
  mocks.session.mockResolvedValue({
    id: 2,
    expiresAt: new Date(Date.now() + 86400_000),
    authorizedUntil: new Date(Date.now() + 600_000),
    createdAt: new Date(Date.now() + 1000),
    userId: 1,
    impersonatedBy: null,
  });
  await renderLoader();
  expect(container.textContent).toContain(
    "Your password has successfully been set.",
  );
});

it("keeps password changes unavailable while impersonating", async () => {
  mocks.session.mockResolvedValue({
    id: 1,
    expiresAt: new Date(Date.now() + 86400_000),
    authorizedUntil: new Date(Date.now() + 600_000),
    createdAt: new Date(),
    userId: 1,
    impersonatedBy: 2,
  });
  await renderLoader();
  expect(container.querySelector("form")).toBeNull();
});
