"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

import fetcher from "@kenstack/api/fetcher";
import type { LogoutResult, UserInfoResult } from "@kenstack/auth/api";
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
const listeners = new Set<() => void>();

function setSnapshot(next: typeof snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
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
      setSnapshot(result.authState);
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

// Seeds the store from a mutation response that already carries the new auth
// state, replacing the follow-up user-info fetch a refresh would make.
export function setUserInfo(authState: PublicAuthState) {
  activeRequest?.controller.abort();
  activeRequest = undefined;
  setSnapshot(authState);
}

export function logoutUser() {
  if (pendingLogout) {
    return pendingLogout;
  }

  activeRequest?.controller.abort();
  activeRequest = undefined;
  const previous = snapshot;
  setSnapshot({ state: "anonymous" });

  const promise = fetcher<LogoutResult>("/api/auth", {
    action: "logout",
  })
    .then((result) => {
      if (result.status === "error") {
        throw new Error(result.message ?? "Unable to log out.");
      }

      setUserInfo(result.authState);
    })
    .catch((thrown: unknown) => {
      setSnapshot(previous);
      throw thrown instanceof Error ? thrown : new Error("Unable to log out.");
    })
    .finally(() => {
      if (pendingLogout === promise) {
        pendingLogout = undefined;
      }
    });

  pendingLogout = promise;
  return promise;
}

function refreshWhenVisible() {
  if (document.visibilityState === "visible") {
    void loadUserInfo();
  }
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
    if (authState && snapshot.state === "loading" && !activeRequest) {
      setSnapshot(authState);
    }
  }, [authState]);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => authState ?? loadingSnapshot,
  );
}
