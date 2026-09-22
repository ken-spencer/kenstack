"use client";

import { useEffect, useRef } from "react";
import { getReauthenticationPath } from "@kenstack/auth/returnTo";

export default function ReauthenticationTimer({
  remainingMs,
}: {
  remainingMs: number;
}) {
  const deadline = useRef<number | null>(null);
  useEffect(() => {
    // Keep elapsed time when Activity hides and restores the form.
    deadline.current ??= performance.now() + remainingMs;
    function checkDeadline() {
      if (deadline.current !== null && performance.now() >= deadline.current) {
        window.location.replace(
          getReauthenticationPath(
            window.location.pathname +
              window.location.search +
              window.location.hash,
          ),
        );
      }
    }
    const timeout = window.setTimeout(
      checkDeadline,
      Math.max(0, Math.ceil(deadline.current - performance.now())),
    );
    window.addEventListener("focus", checkDeadline);
    document.addEventListener("visibilitychange", checkDeadline);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", checkDeadline);
      document.removeEventListener("visibilitychange", checkDeadline);
    };
  }, [remainingMs]);
  return null;
}
