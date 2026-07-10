import { useState, useCallback, useMemo } from "react";

import debounce from "lodash-es/debounce";

export default function useDebounce(
  initialValue: string = "",
  delay: number = 300,
): [string, string, (newValue: string) => void] {
  const [value, setValueBase] = useState(initialValue);
  const [debouncedValue, setDebouncedValueBase] = useState(initialValue);

  const debouncedFunction = useMemo(
    () =>
      debounce((newValue: string) => setDebouncedValueBase(newValue), delay),
    [delay],
  );

  const setDebouncedValue = useCallback(
    (newValue: string): void => {
      setValueBase(newValue);
      debouncedFunction(newValue);
    },
    [debouncedFunction],
  );

  const setValue = useCallback(
    (newValue: string): void => {
      setValueBase(newValue);
      setDebouncedValue(newValue);
    },
    [setDebouncedValue],
  );

  return [value, debouncedValue, setValue];
}
