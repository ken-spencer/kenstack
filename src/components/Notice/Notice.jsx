"use client";

import { useEffect, useCallback, useState, useRef } from "react";

import "./notice.scss";
import ErrorIcon from "@kenstack/icons/Error";
import SuccessIcon from "@kenstack/icons/CheckCircleOutline";
import InformationIcon from "@heroicons/react/24/outline/InformationCircleIcon";

const collapseTime = 400; // ms

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

  const [last, setLast] = useState();
  const lastRef = useRef();
  const ref = useRef();

  const [height, setHeight] = useState(null);
  const [show, setShowBase] = useState(messageText ? true : false);
  const setShow = useCallback((value) => {
    if (value) {
      const style = ref.current.style;
      style.height = "auto";
      // style.transition = "none";
      const hasCollapse = ref.current.classList.contains("collapsed");
      ref.current.classList.remove("collapsed");
      setHeight(ref.current.offsetHeight);
      style.height = "";
      // style.transition = "";
      if (hasCollapse) {
        ref.current.classList.add("collapsed");
      }

      // give height time to set
      setTimeout(() => {
        setShowBase(true);
        setLast(lastRef.current);
      }, collapseTime);
    } else {
      setShowBase(false);
      // collapse is over
      setTimeout(() => {
        setLast(null);
        setHeight(0);
      }, collapseTime);
    }
  }, []);

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
  } else if (!last) {
    return null;
  }

  lastRef.current = {
    messageText,
    classes,
    Icon,
  };

  const NoticeIcon = last?.Icon ?? Icon;
  return (
    <div
      className={
        "notice scroll-mt-16" +
        (last?.classess ?? classes) +
        (show ? "" : " collapsed")
      }
      ref={ref}
      style={
        height
          ? {
              "--notice-height": height + "px",
              transition: `all ${collapseTime}ms ease`,
            }
          : {}
      }
    >
      <NoticeIcon />
      <span>{last?.messageText ?? messageText}</span>
    </div>
  );
}
