"use client";

import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import { setLoginDestination, setUserInfo } from "@kenstack/auth/useUserInfo";

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

export function useCompleteLogin(continuation: Continuation) {
  const { confirm } = useAuthorization();
  return (path: string, authState: PublicAuthState) => {
    if (continuation.mode === "embedded") {
      // The server answers with the page's own address unless it refused it as returnTo, as on
      // /login; only then is the path where the account's sign-ins lead.
      if (getSafeReturnToPath(resolveReturnTo(continuation)) === undefined) {
        setLoginDestination(authState, path);
      }
      setUserInfo(authState);
      continuation.onComplete();
      return;
    }
    if (continuation.mode === "reauthentication") {
      // The wrapper replays what it held, keeping the page's unsaved state.
      confirm(authState);
      return;
    }
    window.location.assign(path);
  };
}
