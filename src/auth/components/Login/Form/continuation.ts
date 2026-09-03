"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { setUserInfo } from "@kenstack/auth/useUserInfo";

// Embedded login stays in its owning flow, including across emailed-link
// verification. Standalone login leaves for the server-selected destination.
export type Continuation =
  | { anchor: string; mode: "embedded"; onComplete: () => void }
  | { anchor?: never; mode?: never; onComplete?: never };

export function resolveReturnTo({ anchor, mode }: Continuation) {
  if (mode === "embedded") {
    // Stale sign-in-link parameters must not ride along into a new request's
    // continuation, where the emailed link would reproduce them.
    const params = new URLSearchParams(window.location.search);
    params.delete("token");
    params.delete("loginMessage");
    return (
      window.location.pathname +
      (params.size ? `?${params}` : "") +
      (anchor ? `#${anchor}` : window.location.hash)
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
  return useCallback(
    (path: string, authState: PublicAuthState) => {
      if (mode === "embedded") {
        setUserInfo(authState);
        onComplete();
        router.refresh();
        return;
      }
      window.location.assign(path);
    },
    [mode, onComplete, router],
  );
}
