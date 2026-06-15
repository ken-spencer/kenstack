"use client";

import { useRef, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import isEqual from "lodash-es/isEqual";
import type { z } from "zod";

import { searchParamsToRecord } from "@kenstack/list/querySchema";

export type SetQueryStore<T> = (
  value: React.SetStateAction<T>,
  debounce?: boolean,
) => void;

export default function useQueryStore<T extends Record<string, unknown>>(
  initial: T,
  {
    debounceMs = 300,
    fallbackState,
    routerMode = "replace",
    onPopState,
    schema,
    serialize,
  }: {
    debounceMs?: number;
    fallbackState?: Partial<T>;
    routerMode?: "replace" | "push";
    onPopState?: (state: T) => void;
    schema: z.ZodType<T>;
    serialize: (state: T) => URLSearchParams;
  },
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const importSearchParams = () => {
    const parsed = schema.safeParse(searchParamsToRecord(searchParams));
    if (parsed.success) {
      return parsed.data;
    }

    return {
      ...initial,
      ...fallbackState,
    };
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
    const params = serialize(v);

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
