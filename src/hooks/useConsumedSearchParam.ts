"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Reads a search parameter once and removes it from the address, so a reload, a shared address or Back
// never brings it again; it keeps returning the value until the address carries a new one. Use it for
// one-time values such as a notice or a link's token. It only reads; to run a request for the value,
// pass it to useParamAction.
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
      null,
      "",
      window.location.pathname +
        (params.size ? `?${params}` : "") +
        window.location.hash,
    );
  }, [name, value]);

  return retainedValue;
}
