"use client";

import { useCallback } from "react";

import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import { setUserInfo } from "@kenstack/auth/useUserInfo";
import { allowUnload } from "@kenstack/forms/NavigationBlocker";

// Embedded login stays in its owning flow, including across emailed-link
// verification, which returns to the flow's URL. Reauthentication confirms the
// signed-in account on its owning page. Standalone login leaves for the
// server-selected destination.
export type Continuation =
  | { anchor: string; mode: "embedded"; onComplete: () => void }
  | { anchor?: never; mode?: "reauthentication"; onComplete?: never };

export function resolveReturnTo({ anchor, mode }: Continuation) {
  if (mode === "reauthentication") {
    // An emailed link, opened in another tab, confirms and lands back on this page as it stands,
    // marked so the page there says the held change still waits in the first tab. The
    // confirmation wrapper reads the mark.
    const params = new URLSearchParams(window.location.search);
    params.set("identityConfirmed", "1");
    return `${window.location.pathname}?${params}${window.location.hash}`;
  }
  if (mode === "embedded") {
    // Stale sign-in-link parameters must not ride along into a new request's
    // continuation, where the emailed link would reproduce them.
    const params = new URLSearchParams(window.location.search);
    params.delete("token");
    params.delete("loginMessage");
    return (
      window.location.pathname +
      (params.size ? `?${params}` : "") +
      `#${anchor}`
    );
  }

  return (
    getSafeReturnToPath(
      new URLSearchParams(window.location.search).get("returnTo"),
    ) ?? ""
  );
}

export function useCompleteLogin({ mode, onComplete }: Continuation) {
  const { confirm } = useAuthorization();
  return useCallback(
    (path: string, authState: PublicAuthState) => {
      if (mode === "embedded") {
        setUserInfo(authState);
        onComplete();
        return;
      }
      if (mode === "reauthentication") {
        // The wrapper replays what it held, keeping the page's unsaved state.
        confirm(authState);
        return;
      }
      window.location.assign(path);
    },
    [confirm, mode, onComplete],
  );
}

// A confirmation sign-in names the account its page was rendered for, and the page reloads when
// another account has signed in since.
export function useReauthenticationAccount() {
  const { userId } = useAuthorization();
  return {
    userId,
    reloadIfChanged: (result: { code?: string; status: string }) => {
      if (result.status === "error" && result.code === "account-changed") {
        allowUnload();
        window.location.reload();
      }
    },
  };
}
