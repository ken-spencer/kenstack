"use client";
import { useState } from "react";
import Alert from "@kenstack/components/Alert";

export default function CookieTest() {
  const [cookiesEnabled] = useState(() => {
    if (typeof document === "undefined") {
      return true;
    }

    document.cookie = "testcookie=1";
    const enabled = document.cookie.indexOf("testcookie") !== -1;
    document.cookie =
      "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    return enabled;
  });

  // const [cookiesEnabled, setCookiesEnabled] = useState(true);
  // let cookiesEnabled = true;
  // if (document?.cookie) {
  //   document.cookie = "testcookie=1";
  //   cookiesEnabled = document.cookie.indexOf("testcookie") !== -1;
  //   document.cookie =
  //     "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  // }

  // useEffect(() => {
  //   document.cookie = "testcookie=1";
  //   setCookiesEnabled(document.cookie.indexOf("testcookie") !== -1);
  //   document.cookie =
  //     "testcookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  // }, []);

  if (!cookiesEnabled) {
    return (
      <Alert>
        Cookies are required to use this site. Please enable them to continue.
      </Alert>
    );
  }

  return null;
}
