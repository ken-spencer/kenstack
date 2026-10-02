"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import fetcher from "@kenstack/api/fetcher";
import type { LogoutResult, UserInfoResult } from "@kenstack/auth/api";
import {
  getRenderedAccount,
  setRenderedAccount,
} from "@kenstack/auth/renderedAccount";
import type { PublicAuthState } from "@kenstack/auth/server/state";

// AccountMenu is site-wide, so this cache avoids shipping React Query on
// otherwise server-only pages.
const loadingSnapshot = { state: "loading" } as const;

let snapshot: PublicAuthState | typeof loadingSnapshot = loadingSnapshot;
let activeRequest:
  | {
      controller: AbortController;
      promise: Promise<void>;
    }
  | undefined;
let pendingLogout: Promise<void> | undefined;
// A logout this tab completed, with the page it started on. The account menu adopts it once that page
// has left (adoptLogout), so a flow underneath never shows signed out first. A reload or server render
// that shows it sooner is this tab's own too.
let loggedOut: { authState: PublicAuthState; pathname: string } | undefined;
// Another account, or none, seen by a page rendered for an account. The account menu's dialog asks the
// visitor to reload; Close dismisses it for that account.
let signInChange:
  { account: number | "none"; isDismissed: boolean } | undefined;
// Where the login flow's final step leaves for, from a sign-in response or a user-info reload, kept with
// the account it is for.
let loginDestination: { path: string; userId: number } | undefined;
const listeners = new Set<() => void>();

function setSnapshot(next: typeof snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function setSignInChange(next: typeof signInChange) {
  signInChange = next;
  listeners.forEach((listener) => listener());
}

// A reload or a later seed follows the page's rendered account. A page rendered signed out, or with no
// seed, takes whatever the session is, and a sign-in becomes its account. A page rendered for an
// account takes only that account; anything else is left for the visitor to reload.
function adoptUserInfo(authState: PublicAuthState, destination?: string) {
  if (loggedOut && accountOf(authState) === accountOf(loggedOut.authState)) {
    loggedOut = undefined;
    setUserInfo(authState);
    return;
  }
  const renderedAccount = getRenderedAccount();
  const account = accountOf(authState);
  if (typeof renderedAccount === "number" && account !== renderedAccount) {
    if (signInChange?.account !== account) {
      setSignInChange({ account, isDismissed: false });
    }
    return;
  }
  if (renderedAccount === "none") {
    setRenderedAccount(account);
  }
  if (authState.state === "authenticated" && destination !== undefined) {
    loginDestination = { path: destination, userId: authState.userId };
  }
  signInChange = undefined;
  setSnapshot(authState);
}

async function loadUserInfo(shouldRestartActiveRequest = false) {
  if (pendingLogout) {
    return pendingLogout;
  }

  if (activeRequest) {
    if (!shouldRestartActiveRequest) {
      return activeRequest.promise;
    }
    activeRequest.controller.abort();
  }

  const controller = new AbortController();

  const promise = fetcher<UserInfoResult>(
    "/api/auth",
    { action: "user-info" },
    { signal: controller.signal },
  )
    .then((result) => {
      if (activeRequest?.controller !== controller) {
        return;
      }
      if (result.status === "error") {
        throw new Error(result.message ?? "Unable to refresh account details.");
      }
      adoptUserInfo(result.authState, result.loginDestination);
    })
    .catch(() => {
      if (activeRequest?.controller !== controller) {
        return;
      }

      // A failed refresh keeps the last known state; only the first load
      // falls back to anonymous.
      if (snapshot.state === "loading") {
        setSnapshot({ state: "anonymous" });
      }
    })
    .finally(() => {
      if (activeRequest?.controller === controller) {
        activeRequest = undefined;
      }
    });

  activeRequest = { controller, promise };
  return promise;
}

export function refreshUserInfo() {
  return loadUserInfo(true);
}

// Seeds the store from a response that already carries the new auth state, replacing the follow-up
// user-info fetch a refresh would make. It is this tab's own sign-in or sign-out, so the page now acts
// for that account; a sent code changes no session. Kenstack's Form calls it for a response's
// `userInfo`, and Kenstack's own requests outside a form and its sign-in paths call it directly; hosts
// never do.
export function setUserInfo(authState: PublicAuthState) {
  activeRequest?.controller.abort();
  activeRequest = undefined;
  if (authState.state !== "code-sent") {
    setRenderedAccount(accountOf(authState));
  }
  signInChange = undefined;
  setSnapshot(authState);
}

// Kenstack's Form and sign-in forms record the destination a response names, before setUserInfo.
export function setLoginDestination(authState: PublicAuthState, path: string) {
  if (authState.state === "authenticated") {
    loginDestination = { path, userId: authState.userId };
  }
}

export function logoutUser() {
  if (pendingLogout) {
    return pendingLogout;
  }

  activeRequest?.controller.abort();
  activeRequest = undefined;
  const { pathname } = window.location;

  const promise = fetcher<LogoutResult>("/api/auth", {
    action: "logout",
  })
    .then((result) => {
      if (result.status === "error") {
        throw new Error(result.message ?? "Unable to log out.");
      }

      loggedOut = { authState: result.userInfo.authState, pathname };
    })
    .finally(() => {
      if (pendingLogout === promise) {
        pendingLogout = undefined;
      }
    });

  pendingLogout = promise;
  return promise;
}

// The account menu calls this as the page changes: a completed logout shows once its page has left.
export function adoptLogout(pathname: string) {
  if (loggedOut && loggedOut.pathname !== pathname) {
    const { authState } = loggedOut;
    loggedOut = undefined;
    setUserInfo(authState);
  }
}

function refreshWhenVisible() {
  if (document.visibilityState === "visible") {
    void loadUserInfo();
  }
}

function accountOf(authState: PublicAuthState) {
  return authState.state === "authenticated" ? authState.userId : "none";
}

function identityOf(authState: PublicAuthState) {
  return authState.state === "authenticated"
    ? `authenticated:${authState.userId}`
    : authState.state === "anonymous"
      ? "anonymous"
      : `${authState.state}:${authState.email}`;
}

// Stable identity avoids a store-instance effect on every component render.
function getSnapshot() {
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    // A hydration layout effect gets one commit to seed before this fallback.
    queueMicrotask(() => {
      if (
        snapshot.state === "loading" &&
        !activeRequest &&
        listeners.size > 0
      ) {
        void loadUserInfo();
      }
    });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    }
  };
}

export function useUserInfo(authState?: PublicAuthState) {
  // Writing module state during SSR could expose one request's identity to
  // another. Layout timing seeds only the browser and avoids a first-paint swap.
  useLayoutEffect(() => {
    if (!authState) {
      return;
    }
    // The first server render in the document states the page's account; later ones leave it.
    if (getRenderedAccount() === undefined) {
      setRenderedAccount(accountOf(authState));
    }
    if (snapshot.state === "loading") {
      if (!activeRequest) {
        setSnapshot(authState);
      }
      return;
    }
    // A server render that sees another identity than this browser's copy, such as a session ended
    // elsewhere, is settled by asking the server, not by trusting either.
    if (identityOf(authState) !== identityOf(snapshot)) {
      void refreshUserInfo();
    }
  }, [authState]);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => authState ?? loadingSnapshot,
  );
}

// Resolves once any user-info check in flight has settled: true while the page's account still
// holds, false once a check has found another account or none.
export async function isUserInfoCurrent() {
  await activeRequest?.promise;
  return signInChange === undefined;
}

// The login destination for the account the store holds, if a sign-in or reload named one.
export function useLoginDestination() {
  return useSyncExternalStore(
    subscribe,
    () =>
      snapshot.state === "authenticated" &&
      loginDestination?.userId === snapshot.userId
        ? loginDestination.path
        : undefined,
    () => undefined,
  );
}

export function useSignInChange() {
  const change = useSyncExternalStore(
    subscribe,
    () => signInChange,
    () => undefined,
  );
  return {
    close: () => {
      if (signInChange) {
        setSignInChange({ ...signInChange, isDismissed: true });
      }
    },
    // Until the page reloads or this tab signs in again, a dismissed change still stands.
    hasChanged: change !== undefined,
    isOpen: change !== undefined && !change.isDismissed,
    // The account menu brings the dialog back while the change stands.
    reopen: () => {
      if (signInChange) {
        setSignInChange({ ...signInChange, isDismissed: false });
      }
    },
  };
}
