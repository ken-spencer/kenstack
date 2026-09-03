"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function useConsumedSearchParam(name: string) {
  const searchParams = useSearchParams();
  const value = searchParams.get(name);
  const [consumed, setConsumed] = useState({
    name,
    retainedValue: value,
    urlValue: value,
  });
  const hasSearchParamChanged =
    consumed.name !== name || consumed.urlValue !== value;
  const retainedValue = hasSearchParamChanged
    ? (value ?? (consumed.name === name ? consumed.retainedValue : null))
    : consumed.retainedValue;

  if (hasSearchParamChanged) {
    setConsumed({
      name,
      retainedValue,
      urlValue: value,
    });
  }

  useEffect(() => {
    if (value === null) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get(name) !== value) return;

    params.delete(name);
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname +
        (params.size ? `?${params}` : "") +
        window.location.hash,
    );
  }, [name, value]);

  return retainedValue;
}
