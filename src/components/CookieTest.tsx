"use client";
import { useEffect, useState } from "react";
import Alert from "@kenstack/components/Alert";

export default function CookieTest() {
  const [cookiesEnabled, setCookiesEnabled] = useState(true);

  useEffect(() => {
    document.cookie = "testcookie=1";
    setCookiesEnabled(document.cookie.indexOf("testcookie") !== -1);
    document.cookie =
      "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  }, []);

  if (!cookiesEnabled) {
    return (
      <Alert>
        Cookies are required to use this site. Please enable them to continue.
      </Alert>
    );
  }

  return null;
}
