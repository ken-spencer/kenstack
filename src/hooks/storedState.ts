"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import type * as z from "zod";

import { isRecord } from "@kenstack/lib/isRecord";

// A store is a set of named slices in this tab's sessionStorage under one id;
// the tab closing clears it. StepFlow keys its store on the flow's base path;
// a flow owner that knows that path reads the same slices.

const storedStateChangeEvent = "stored-state-change";
const storageAvailabilityChangeEvent = "stored-state-availability-change";
const probeKey = "stored-state:$probe";
let hasStorageMutationFailed = false;
let storageAvailabilitySubscriberCount = 0;

// A test write on mount finds blocked storage before the visitor acts, and
// every mutation checks again. Once one fails, the owner stops and asks the
// visitor to enable site data and reload.
export function useStorageAvailability() {
  useEffect(() => {
    if (writeStorageItem(probeKey, "")) {
      removeStorageItem(probeKey);
    }
  }, []);

  return useSyncExternalStore(
    subscribeToStorageAvailability,
    isStorageAvailable,
    isStorageAvailable,
  );
}

function isStorageAvailable() {
  return !hasStorageMutationFailed;
}

function readStorageItem(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string) {
  if (hasStorageMutationFailed) {
    return false;
  }

  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    notifyStorageAvailabilityChange();
    return false;
  }
}

function removeStorageItem(key: string) {
  if (hasStorageMutationFailed) {
    return false;
  }

  try {
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    notifyStorageAvailabilityChange();
    return false;
  }
}

export function useStoredValue<T>(
  storeId: string,
  name: string,
  schema: z.ZodType<T>,
): readonly [
  T | undefined,
  (update: SetStateAction<T | undefined>) => boolean,
] {
  const key = getStorageKey(storeId, name);
  // A slice is absent on the server and during hydration; a consumer that
  // must tell that apart from "nothing stored" checks useIsHydrated().
  const stored = useSyncExternalStore(
    useCallback(
      (notify: () => void) => subscribeToStorageKey(key, notify),
      [key],
    ),
    useCallback(() => readStorageItem(key), [key]),
    absentSnapshot,
  );
  const parsedValue = useMemo(
    () => parseStoredValue(stored, schema),
    [schema, stored],
  );

  useEffect(() => {
    if (stored === null || parsedValue !== undefined) {
      return;
    }

    if (!removeStorageItem(key)) {
      return;
    }

    notifyStoredStateChange(key);
  }, [key, parsedValue, stored]);

  return [
    parsedValue,
    useCallback(
      (update: SetStateAction<T | undefined>) => {
        const nextValue =
          typeof update === "function"
            ? (update as (current: T | undefined) => T | undefined)(
                parseStoredValue(readStorageItem(key), schema),
              )
            : update;

        const didUpdate =
          nextValue === undefined
            ? removeStorageItem(key)
            : writeStorageItem(key, JSON.stringify({ value: nextValue }));

        if (didUpdate) {
          notifyStoredStateChange(key);
        }

        return didUpdate;
      },
      [key, schema],
    ),
  ];
}

export function readStoredValue<T>(
  storeId: string,
  name: string,
  schema: z.ZodType<T>,
) {
  return parseStoredValue(
    readStorageItem(getStorageKey(storeId, name)),
    schema,
  );
}

export function clearStoredState(storeId: string) {
  const prefix = getStorageKey(storeId, "");
  const removedKeys: string[] = [];

  try {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);

      if (key?.startsWith(prefix) && removeStorageItem(key)) {
        removedKeys.push(key);
      }
    }
  } catch {
    notifyStorageAvailabilityChange();
  }

  removedKeys.forEach(notifyStoredStateChange);
}

function parseStoredValue<T>(value: string | null, schema: z.ZodType<T>) {
  if (value === null) return undefined;

  try {
    const stored: unknown = JSON.parse(value);

    if (!isRecord(stored) || !Object.hasOwn(stored, "value")) {
      return undefined;
    }

    const result = schema.safeParse(stored.value);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

export function getStorageKey(storeId: string, name: string) {
  return `stored-state:${encodeURIComponent(storeId)}:${name}`;
}

function notifyStoredStateChange(key: string) {
  window.dispatchEvent(
    new CustomEvent(storedStateChangeEvent, { detail: key }),
  );
}

function notifyStorageAvailabilityChange() {
  hasStorageMutationFailed = true;
  window.dispatchEvent(new Event(storageAvailabilityChangeEvent));
}

function subscribeToStorageAvailability(notify: () => void) {
  storageAvailabilitySubscriberCount += 1;
  window.addEventListener(storageAvailabilityChangeEvent, notify);
  return () => {
    window.removeEventListener(storageAvailabilityChangeEvent, notify);
    storageAvailabilitySubscriberCount -= 1;
    if (storageAvailabilitySubscriberCount === 0) {
      hasStorageMutationFailed = false;
    }
  };
}

function absentSnapshot() {
  return null;
}

// Only this tab writes its sessionStorage, so its own change event is the
// whole subscription; no other tab's storage event can reach it.
function subscribeToStorageKey(key: string, notify: () => void) {
  function handleStoredStateChange(event: Event) {
    if ((event as CustomEvent<string>).detail === key) {
      notify();
    }
  }

  window.addEventListener(storedStateChangeEvent, handleStoredStateChange);
  return () => {
    window.removeEventListener(storedStateChangeEvent, handleStoredStateChange);
  };
}
