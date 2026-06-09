"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import isEqual from "lodash-es/isEqual";
import type { z } from "zod";

export type SetQueryStore<T> = (
  value: React.SetStateAction<T>,
  debounce?: boolean,
) => void;

export default function useQueryStore<T extends Record<string, unknown>>(
  initial: T,
  {
    debounceMs = 300,
    excludeParams = ["page"],
    fallbackState,
    routerMode = "replace",
    onPopState,
    schema,
  }: {
    debounceMs?: number;
    excludeParams?: string[];
    fallbackState?: Partial<T>;
    routerMode?: "replace" | "push";
    onPopState?: (state: T) => void;
    schema?: z.ZodType<T>;
  } = {},
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const importSearchParams = () => {
    const pairs = Object.entries(initial).map(([key, val]) => {
      const param = searchParams.get(key);
      const fallbackValue =
        fallbackState &&
        Object.prototype.hasOwnProperty.call(fallbackState, key)
          ? fallbackState[key as keyof T]
          : val;

      if (param) {
        try {
          return [key, JSON.parse(param)] as const;
        } catch {
          return [key, fallbackValue] as const;
        }
      } else {
        return [key, fallbackValue] as const;
      }
    });
    const parsedParams = Object.fromEntries(pairs);
    const parsed = schema?.safeParse(parsedParams);
    return (parsed?.success ? parsed.data : parsedParams) as T;
  };

  const [value, setValue] = useState<T>(() => importSearchParams());
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const valueRef = useRef(value);
  const initialSearchParams = useRef(searchParams);
  const skipRef = useRef(false);

  useEffect(() => {
    if (initialSearchParams.current === searchParams) {
      return;
    }
    if (skipRef.current === true) {
      skipRef.current = false;
      return;
    }
    const params = importSearchParams();
    valueRef.current = params;
    setValue(params);
    setDebouncedValue(params);
    if (onPopState) {
      onPopState(params);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      if (json === null || isEqual(val, initial[key])) {
        params.delete(key);
      } else {
        params.set(key, json);
      }
    });

    const nextSearch = params.toString();
    const href = pathname + (nextSearch ? `?${nextSearch}` : "");
    const currentSearch = searchParams.toString();
    const currentHref = pathname + (currentSearch ? `?${currentSearch}` : "");

    if (href === currentHref) {
      return;
    }

    skipRef.current = true;
    if (routerMode === "push") {
      router.push(href, { scroll: false });
    } else {
      router.replace(href, { scroll: false });
    }
  };

  const set: SetQueryStore<T> = (next, debounce = true) => {
    const resolved =
      typeof next === "function"
        ? (next as (p: T) => T)(valueRef.current)
        : next;

    if (isEqual(valueRef.current, resolved)) {
      return;
    }

    valueRef.current = resolved;
    setValue(resolved);

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
  };

  return [value, debouncedValue, set] as const;
}
