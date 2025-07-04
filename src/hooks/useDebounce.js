import { useState, useCallback, useMemo } from "react";

import debounce from "lodash-es/debounce";

export default function useDebounce(initialValue = "", delay = 300) {
  const [value, setValueBase] = useState(initialValue);
  const [debouncedValue, setDebouncedValueBase] = useState(initialValue);

  const debouncedFunction = useMemo(
    () => debounce((newValue) => setDebouncedValueBase(newValue), delay),
    [delay]
  );

  const setDebouncedValue = useCallback(
    (newValue) => {
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
    (newValue) => {
      setValueBase(newValue);
      setDebouncedValue(newValue);
    },
    [setDebouncedValue]
  );

  return [value, debouncedValue, setValue];
}
