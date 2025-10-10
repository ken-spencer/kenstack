"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Minimal generic URL param hook (no debounce/useEffect loops).
 * - Always stores JSON under a single key.
 * - Works for strings or plain objects.
 * - Debounce happens inside the setter when requested.
 * - Optionally excludes params (e.g., `page`) on write.
 * - Does not auto-sync on back/forward; caller can opt-in separately if needed.
 */

export type SetQueryStore<T> = (
  value: React.SetStateAction<T>,
  debounce?: boolean
) => void;

export default function useQueryStore<T extends Record<string, unknown>>(
  initial: T,
  {
    debounceMs = 300,
    excludeParams = ["page"],
    routerMode = "replace",
    onPopState,
  }: {
    /** Milliseconds to debounce when `set(value, { debounce: true })` is used. */
    debounceMs?: number;
    /** Params to remove from the URL when writing (e.g., pagination). */
    excludeParams?: string[];
    routerMode?: "replace" | "push";
    onPopState?: (state: T) => void;
  } = {}
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const importSearchParams = () => {
    const pairs = Object.entries(initial).map(([key, val]) => {
      const param = searchParams.get(key);
      if (param) {
        try {
          return [key, JSON.parse(param)] as const;
        } catch {
          return [key, val] as const;
        }
      } else {
        return [key, val] as const;
      }
    });
    return Object.fromEntries(pairs) as T;
  };

  //  eslint-disable-next-line react-hooks/exhaustive-deps
  const init = useMemo(importSearchParams, []);

  const [value, setValue] = useState<T>(init);
  const [debouncedValue, setDebouncedValue] = useState<T>(init);
  const initialSearchParams = useRef(searchParams);
  const skipRef = useRef(false);

  // ensure state is  up to date with back / forward navigation
  useEffect(() => {
    if (initialSearchParams.current === searchParams) {
      return;
    }
    if (skipRef.current === true) {
      skipRef.current = false;
      return;
    }
    const params = importSearchParams();
    setValue(params);
    if (onPopState) {
      onPopState(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Single timer for debounced writes
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending debounce on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const writeToUrl = (v: T) => {
    const params = new URLSearchParams(searchParams);
    for (const p of excludeParams) {
      params.delete(p);
    }

    const encode = (x: unknown): string | null => {
      if (x === undefined) {
        return null;
      }
      try {
        return JSON.stringify(x);
      } catch {
        return null;
      }
    };

    Object.entries(v).forEach(([key, val]) => {
      const json = encode(val);
      const initJson = encode(initial[key]);
      if (json === null || json === initJson) {
        params.delete(key);
      } else {
        params.set(key, json);
      }
    });

    const href = pathname + (params.size ? "?" + params : "");
    if (routerMode === "push") {
      // note, this doesn't seem to work, act's like replace most of the time.
      router.push(href, { scroll: false });
    } else {
      router.replace(href, { scroll: false });
    }
  };

  /**
   * Set the value. If `opts.debounce` is true, URL write is delayed by `debounceMs`.
   * Without debounce, writes immediately and cancels any pending debounce.
   */
  const set: SetQueryStore<T> = (next, debounce = true) => {
    skipRef.current = true;
    setValue((prev) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;

      if (debounce) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
          setDebouncedValue(resolved);
          writeToUrl(resolved);
          timerRef.current = null;
        }, debounceMs);
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setDebouncedValue(resolved);
        writeToUrl(resolved);
      }

      return resolved;
    });
  };

  return [value, debouncedValue, set] as const;
}
