"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import { setUserInfo } from "@kenstack/auth/useUserInfo";

// Embedded login stays in its owning flow, including across emailed-link
// verification, which returns to the flow's URL. Reauthentication confirms the
// signed-in account on its owning page. Standalone login leaves for the
// server-selected destination.
export type Continuation =
  | { anchor: string; mode: "embedded"; onComplete: () => void }
  | { anchor?: never; mode?: "reauthentication"; onComplete?: never };

export function resolveReturnTo({ anchor, mode }: Continuation) {
  if (mode === "reauthentication") {
    // Keep a pending email-change token until identity confirmation finishes.
    return (
      window.location.pathname + window.location.search + window.location.hash
    );
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
  const router = useRouter();
  const authorization = useAuthorization();
  return useCallback(
    (path: string, authState: PublicAuthState) => {
      if (mode === "embedded") {
        setUserInfo(authState);
        onComplete();
        return;
      }
      if (mode === "reauthentication") {
        // Another account must not inherit this page's unsaved client state.
        if (
          authState.state !== "authenticated" ||
          authState.userId !== authorization.userId
        ) {
          window.location.reload();
          return;
        }
        // The refreshed server tree carries the new session to the inline
        // wrapper, keeping unsaved state elsewhere on the page.
        setUserInfo(authState);
        router.refresh();
        return;
      }
      window.location.assign(path);
    },
    [authorization.userId, mode, onComplete, router],
  );
}
