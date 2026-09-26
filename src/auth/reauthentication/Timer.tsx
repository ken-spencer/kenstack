"use client";

import { useEffect, useEffectEvent } from "react";

// `deadline` is on the performance.now() clock, anchored once when the
// authorization arrives, so a hidden Activity resumes against the same time.
export default function ReauthenticationTimer({
  deadline,
  onExpire,
}: {
  deadline: number;
  onExpire: () => void;
}) {
  const expire = useEffectEvent(onExpire);
  useEffect(() => {
    function checkDeadline() {
      if (performance.now() >= deadline) {
        expire();
      }
    }
    const timeout = window.setTimeout(
      checkDeadline,
      Math.max(0, Math.ceil(deadline - performance.now())),
    );
    window.addEventListener("focus", checkDeadline);
    document.addEventListener("visibilitychange", checkDeadline);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", checkDeadline);
      document.removeEventListener("visibilitychange", checkDeadline);
    };
  }, [deadline]);
  return null;
}
