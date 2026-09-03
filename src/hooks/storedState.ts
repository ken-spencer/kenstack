"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import type * as z from "zod";

import { parseDuration } from "@kenstack/lib/duration";

// A store is a set of named slices in localStorage under one id, sharing one
// 24-hour lifetime that every write refreshes. StepFlow keys its store on the
// flow's base path; a flow owner that knows that path reads the same slices.

type StoredValue<T> = {
  value: T;
};

const storedStateChangeEvent = "stored-state-change";
const storageAvailabilityChangeEvent = "stored-state-availability-change";
let hasStorageMutationFailed = false;
let storageAvailabilitySubscriberCount = 0;

// Storage is assumed available until a mutation fails; the owner then stops
// and asks the visitor to enable site data and reload.
export function useStorageAvailability() {
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
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string) {
  if (hasStorageMutationFailed) {
    return false;
  }

  try {
    window.localStorage.setItem(key, value);
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
    window.localStorage.removeItem(key);
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
  // A slice is visible only while the store's shared deadline is in the
  // future. It is absent on the server and during hydration; a consumer that
  // must tell that apart from "nothing stored" checks useIsHydrated().
  const stored = useSyncExternalStore(
    useCallback(
      (notify: () => void) => subscribeToStorageKey(storeId, key, notify),
      [storeId, key],
    ),
    useCallback(() => {
      const deadline = readStoreDeadline(storeId);
      return deadline !== undefined && deadline > Date.now()
        ? readStorageItem(key)
        : null;
    }, [storeId, key]),
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
        // A write to a store without a live deadline starts a fresh store: the
        // leftovers go first, so a stale tab cannot carry old values forward.
        const deadline = readStoreDeadline(storeId);
        if (deadline === undefined || deadline <= Date.now()) {
          clearStoredState(storeId);
        }

        const nextValue =
          typeof update === "function"
            ? (update as (current: T | undefined) => T | undefined)(
                parseStoredValue(readStorageItem(key), schema),
              )
            : update;

        const didUpdate =
          nextValue === undefined
            ? removeStorageItem(key)
            : writeStorageItem(
                key,
                JSON.stringify({ value: nextValue } satisfies StoredValue<T>),
              );

        if (!didUpdate) {
          return false;
        }

        notifyStoredStateChange(key);

        // Only a written value extends the store's lifetime; a removal leaves
        // the deadline alone, so a cleared store stays empty.
        if (nextValue === undefined) {
          return true;
        }

        const deadlineKey = getStorageDeadlineKey(storeId);
        if (
          !writeStorageItem(
            deadlineKey,
            String(Date.now() + parseDuration("24 hours")),
          )
        ) {
          return false;
        }

        notifyStoredStateChange(deadlineKey);
        return true;
      },
      [storeId, key, schema],
    ),
  ];
}

export function clearStoredState(storeId: string) {
  const prefix = getStorageKey(storeId, "");
  const removedKeys: string[] = [];

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);

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
    const stored = JSON.parse(value) as unknown;

    if (
      stored === null ||
      typeof stored !== "object" ||
      !Object.hasOwn(stored, "value")
    ) {
      return undefined;
    }

    const result = schema.safeParse((stored as StoredValue<unknown>).value);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}

function getStorageKey(storeId: string, name: string) {
  return `stored-state:${encodeURIComponent(storeId)}:${name}`;
}

function getStorageDeadlineKey(storeId: string) {
  return getStorageKey(storeId, "$expiresAt");
}

function readStoreDeadline(storeId: string) {
  const deadline = Number(readStorageItem(getStorageDeadlineKey(storeId)));
  return Number.isSafeInteger(deadline) && deadline > 0 ? deadline : undefined;
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

function subscribeToStorageKey(
  storeId: string,
  key: string,
  notify: () => void,
) {
  const deadlineKey = getStorageDeadlineKey(storeId);

  function isRelevant(changedKey: string | null) {
    return (
      changedKey === null || changedKey === key || changedKey === deadlineKey
    );
  }

  function handleStoredStateChange(event: Event) {
    if (isRelevant((event as CustomEvent<string>).detail)) {
      notify();
    }
  }

  function handleStorageChange(event: StorageEvent) {
    if (isRelevant(event.key)) {
      notify();
    }
  }

  window.addEventListener(storedStateChangeEvent, handleStoredStateChange);
  window.addEventListener("storage", handleStorageChange);
  return () => {
    window.removeEventListener(storedStateChangeEvent, handleStoredStateChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}
