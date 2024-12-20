import { useState } from "react";
import { useRef, useEffect } from "react";
import Alert from "./Alert";

import useForm from "./useForm";

export default function Notice({ name, ...props }) {
  const form = useForm();
  const { error, success } = form;
  const [cookieError, setCookieError] = useState();
  const [cookieSuccess, setCookieSuccess] = useState();

  const ref = useRef();

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
        const json = JSON.parse(cookie);
        if (json.error) {
          setCookieError(json.error);
        } else if (json.success) {
          setCookieSuccess(json.success);
        }
      } else {
        setCookieError(cookie);
      }
    } else {
      // const href = window.location.href;
      const url = new URL(window.location.href);
      const err = url.searchParams.get(name);
      if (err) {
        setCookieError(err);
      }
      window.history.replaceState(null, null, url.origin + url.pathname);
    }

    /*
    const val = encodeURIComponent("This is an error message");
    */
  }, [name]);

  const notice = error || success || cookieError || cookieSuccess;
  useEffect(() => {
    if (notice && ref.current) {
      // ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      const headers = document.getElementsByTagName("header");
      const header = headers.length ? headers.item(0) : false;
      // const offset = parseFloat(computedStyles.paddingTop) + 10;

      let offset = 10;
      if (header) {
        const computedStyles = window.getComputedStyle(header);
        if (
          computedStyles.position === "fixed" ||
          computedStyles.position === "sticky"
        ) {
          const rect = header.getBoundingClientRect();
          offset += rect.height;
        }
      }

      const scroll =
        ref.current.getBoundingClientRect().top -
        document.body.getBoundingClientRect().top -
        offset;

      window.scrollTo({
        behavior: "smooth",
        top: scroll > 0 ? scroll : 0,
      });
    }
  }, [notice, form.state]);

  if (!notice) {
    return null;
  }
  let severity;
  if (error) {
    severity = "error";
  } else if (success) {
    severity = "success";
  } else if (cookieError) {
    severity = "error";
  } else {
    severity = "success";
  }

  return (
    <Alert
      ref={ref}
      severity={severity}
      sx={{ scrollMarginTop: "75px" }}
      {...props}
    >
      {notice}
    </Alert>
  );
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
