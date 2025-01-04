import { useState, useEffect } from "react";
import Notice from "@kenstack/components/Notice";

export default function RefererNotice({ name, ...props }) {
  const [message, setMessage] = useState();

  useEffect(() => {
    if (!name) {
      return;
    }

    const cookie = getCookie(name);

    if (cookie) {
      // one use cookie. Delete it after the message is displayed.
      document.cookie =
        name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

      if (cookie.match(/^{/)) {
        const cookieMessage = JSON.parse(cookie);
        setMessage(cookieMessage);
      } else {
        setMessage({ error: cookie });
      }
    } else {
      // error is stored in the query string
      const url = new URL(window.location.href);
      const err = url.searchParams.get(name);
      if (err) {
        setMessage({ err });
      }
      window.history.replaceState(null, null, url.origin + url.pathname);
    }
  }, [name]);

  if (!message) {
    return null;
  }

  return <Notice message={message} {...props} />;
}

function getCookie(name) {
  const cookies = document.cookie.split(";");
  const cookie = cookies.find((value) => value.trim().startsWith(name + "="));

  if (cookie) {
    const [, encoded] = cookie.split("=");
    return decodeURIComponent(encoded);
  }

  return null;
}
