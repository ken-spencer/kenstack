import { useState, useCallback, useMemo } from "react";

import debounce from "lodash-es/debounce";

export default function useDebounce(
  initialValue: string = "",
  delay: number = 300
): [string, string, (newValue: string) => void] {
  const [value, setValueBase] = useState<string>(initialValue);
  const [debouncedValue, setDebouncedValueBase] = useState<string>(initialValue);

  const debouncedFunction = useMemo<((newValue: string) => void)>(
    () => debounce((newValue: string) => setDebouncedValueBase(newValue), delay),
    [delay]
  );

  const setDebouncedValue = useCallback(
    (newValue: string): void => {
      setValueBase(newValue);
      debouncedFunction(newValue);
    },
    [debouncedFunction]
  );

  /*
  const setDebouncedValue = useCallback(
    debounce((value) => setDebouncedValueBase(value), delay),
    [delay],
  );
  */
  const setValue = useCallback(
    (newValue: string): void => {
      setValueBase(newValue);
      setDebouncedValue(newValue);
    },
    [setDebouncedValue]
  );

  return [value, debouncedValue, setValue];
}
