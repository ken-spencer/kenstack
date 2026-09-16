"use client";

import { useSyncExternalStore } from "react";

// The step's form verifies an emailed link's token; its controller holds the
// step open for a signed-in visit until that has happened. They render in
// different subtrees, so the handled token is shared here. A visit carries
// at most one token, and a later visit with a new one starts unhandled.
let handledToken: string | null = null;
const listeners = new Set<() => void>();

export function markLinkHandled(token: string) {
  handledToken = token;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHandledLinkToken() {
  return useSyncExternalStore(
    subscribe,
    () => handledToken,
    () => null,
  );
}
