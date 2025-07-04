"use client";
import { useEffect, useState, useRef } from "react";

import "./notice.scss";
import NoticeBase from "./Base";

export default function Notice({
  actionState,
  message = null, // object with cussess, information or error string.
  removeMessage = null, // callback to remove message once collapse is complete
  error: errorProp,
  success: successProp,
  information: informationProp,
  collapse = false,
  scroll = false,
  className = "",
}) {
  if (actionState) {
    throw Error("actionsState has been deprecated. use message instead");
  }

  if (!collapse && removeMessage) {
    throw Error("removeMessage only works when 'collapse' is true");
  }

  const error = errorProp || message?.error;
  const success =
    successProp ||
    (typeof message?.success === "string" ? message?.success : null);
  const information = informationProp || message?.information;

  const messageText = error || success || information;

  const timeout = useRef();

  // const [last, setLast] = useState();
  const ref = useRef();

  const [show, setShow] = useState(false);
  // const [height, setHeight] = useState(null);
  useEffect(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
      setShow(false);
    }

    if (!messageText || !collapse) {
      return;
    }

    setShow(true);

    if (ref.current && scroll) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest", // Scroll only as much as needed vertically
      });
    }

    timeout.current = setTimeout(
      () => {
        setShow(false);
        setTimeout(() => {
          if (removeMessage) {
            removeMessage(message);
          }
        }, 1000);
      },
      error ? 5000 : 5500
    );
  }, [message, messageText, scroll, setShow, collapse, removeMessage, error]);

  let classes = className ? " " + className : "";
  let type;
  if (error) {
    type = "error";
  } else if (success) {
    type = "success";
  } else if (information) {
    type = "information";
  }

  return (
    <NoticeBase
      className={
        "notice scroll-mt-16" +
        /*last?.classess ??*/ classes +
        (show || !collapse ? "" : " collapsed")
      }
      type={type}
      ref={ref}
      style={
        collapse
          ? {
              "--notice-height": show ? "auto" : 0,
            }
          : {}
      }
    >
      {messageText}
    </NoticeBase>
  );
}
