"use client";
import { useEffect, useState } from "react";
import Notice from "@kenstack/components/Notice";

export default function CookieTest() {
  const [cookiesEnabled, setCookiesEnabled] = useState(true);

  useEffect(() => {
    document.cookie = "testcookie=1; path=/; samesite=lax";
    const enabled = document.cookie
      .split("; ")
      .some((cookie) => cookie === "testcookie=1");
    document.cookie =
      "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=lax";
    const update = window.setTimeout(() => setCookiesEnabled(enabled));
    return () => window.clearTimeout(update);
  }, []);

  if (!cookiesEnabled) {
    return (
      <Notice role="alert">
        Cookies are required to use this site. Please enable them to continue.
      </Notice>
    );
  }

  return null;
}
