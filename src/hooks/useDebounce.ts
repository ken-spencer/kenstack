import { useEffect, useState } from "react";

export default function useDebounce(
  initialValue: string = "",
  delay: number = 300,
): [string, string, (newValue: string) => void] {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [delay, value]);

  return [value, debouncedValue, setValue];
}
