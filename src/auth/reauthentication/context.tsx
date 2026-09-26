"use client";

import { createContext, useContext } from "react";
import type { Authorization } from "./server";

// Outside an inline wrapper, no account is protected, grants are ignored and
// requests run untracked.
export const AuthorizationContext = createContext<{
  userId?: number;
  setAuthorization: (authorization: Authorization) => void;
  track: <T extends { status: string }>(
    request: Promise<T>,
    options?: { rotatesSession?: boolean },
  ) => Promise<T>;
}>({ setAuthorization: () => {}, track: (request) => request });

export function useAuthorization() {
  return useContext(AuthorizationContext);
}
