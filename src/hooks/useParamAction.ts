"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

// Runs the action once per parameter value, such as a link's token, and reports its result, or
// undefined when the request itself failed, for the latest value only. Returns whether that value's
// result is still to come.
// It takes a value and acts on it; it reads nothing from the address. Pair it with
// useConsumedSearchParam when the value arrives in a link and must leave the address once read.
export default function useParamAction<TResult>(
  value: string | null,
  action: (value: string) => Promise<TResult>,
  onResult: (value: string, result: TResult | undefined) => void,
) {
  const startedRef = useRef<string | null>(null);
  // The caller may unmount before the result arrives, such as a visitor leaving a link's page before it
  // verifies; a late result then reports nothing.
  const isMountedRef = useRef(false);
  const [settledValue, setSettledValue] = useState<string | null>(null);
  const run = useEffectEvent((activeValue: string) => action(activeValue));
  const settle = useEffectEvent(
    (activeValue: string, result: TResult | undefined) => {
      if (!isMountedRef.current || startedRef.current !== activeValue) {
        return;
      }
      setSettledValue(activeValue);
      // A value the caller has since dropped, such as a link left before it verified, reports nothing.
      if (activeValue === value) {
        onResult(activeValue, result);
      }
    },
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (value === null || startedRef.current === value) {
      return;
    }

    startedRef.current = value;
    run(value).then(
      (result) => settle(value, result),
      () => settle(value, undefined),
    );
  }, [value]);

  return value !== null && settledValue !== value;
}
