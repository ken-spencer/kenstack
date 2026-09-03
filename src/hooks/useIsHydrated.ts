"use client";

import { useSyncExternalStore } from "react";

// False during the server render and the hydration render, when browser-only
// state such as localStorage is unreadable; true on every render after, and
// immediately for components mounted by later client navigation.
export default function useIsHydrated() {
  return useSyncExternalStore(subscribe, isHydrated, isServer);
}

function subscribe() {
  return () => {};
}

function isHydrated() {
  return true;
}

function isServer() {
  return false;
}
