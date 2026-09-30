"use client";

import { createContext, useContext } from "react";

import type { PublicAuthState } from "@kenstack/auth/server/state";

// Outside a ReauthenticationForm no account is protected: requests run untracked and a confirmation
// has nothing to replay.
export const AuthorizationContext = createContext<{
  // Closes the confirmation, settling what it holds with the original refusal.
  cancel: () => void;
  // Called by the confirmation sign-in with the state it signed in.
  confirm: (authState: PublicAuthState) => void;
  // True while the confirmation is open, holding a refused request.
  isHolding: boolean;
  // Quietly tries what the confirmation holds again, for a sign-in finished in another tab; a
  // refusal leaves the confirmation as it is.
  replay: () => void;
  // Runs a protected request. A refusal for stale authorization holds it until the person confirms,
  // and the promise settles with the replay's result.
  track: <T extends { code?: string; status: string }>(
    request: () => Promise<T>,
  ) => Promise<T>;
  // The account the wrapper was rendered for, never the live user info.
  userId?: number;
}>({
  cancel: () => {},
  confirm: () => {},
  isHolding: false,
  replay: () => {},
  track: (request) => request(),
});

export function useAuthorization() {
  return useContext(AuthorizationContext);
}
