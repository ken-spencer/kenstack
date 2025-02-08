"use client";
import { useEffect, useState, useRef } from "react";

import "./notice.scss";
import ErrorIcon from "@kenstack/icons/Error";
import SuccessIcon from "@kenstack/icons/CheckCircleOutline";
import InformationIcon from "@heroicons/react/24/outline/InformationCircleIcon";

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
      },
      error ? 5000 : 5500,
    );
  }, [message, messageText, scroll, setShow, collapse, error]);

  let classes = className ? " " + className : "";
  let Icon;
  if (error) {
    Icon = ErrorIcon;
    classes += " notice-error";
  } else if (success) {
    Icon = SuccessIcon;
    classes += " notice-success";
  } else if (information) {
    Icon = InformationIcon;
    classes += " notice-information";
  }
  //  else if (!last) {
  //   return null;
  // }

  // const NoticeIcon = last?.Icon ?? Icon;
  return (
    <div
      className={
        "notice scroll-mt-16" +
        (/*last?.classess ??*/ classes) +
        (show ? "" : " collapsed")
      }
      ref={ref}
      style={
        collapse
          ? {
              "--notice-height": show ? "auto" : 0,
            }
          : {}
      }
    >
      <Icon />
      <span>{/* last?.messageText ?? */ messageText}</span>
    </div>
  );
}
