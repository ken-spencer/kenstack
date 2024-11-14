"use client";

import { useEffect, useCallback, useState, useRef } from "react";

import "./notice.scss";
import ErrorIcon from "@kenstack/icons/Error";
import SuccessIcon from "@kenstack/icons/CheckCircleOutline";
import InformationIcon from "@heroicons/react/24/outline/InformationCircleIcon";

const collapseTime = 400; // ms

export default function Notice({
  actionState,
  noScroll = false, // TODO make scroll opt in with a scroll flag. Possibly redundant with components version
  error: errorProp,
  success: successProp,
  information: informationProp,
  collapse = false,
  className = "",
}) {
  const error = errorProp || actionState?.error;
  const success =
    successProp ||
    (typeof actionState?.success === "string" ? actionState?.success : null);
  const information = informationProp || actionState?.information;

  const message = error || success || information;

  const timeout = useRef();

  const [last, setLast] = useState();
  const lastRef = useRef();
  const ref = useRef();

  const [height, setHeight] = useState(null);
  const [show, setShowBase] = useState(message ? true : false);
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

    if (!message || !collapse) {
      return;
    }

    setShow(true);

    if (ref.current && noScroll == false) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }

    timeout.current = setTimeout(
      () => {
        setShow(false);
      },
      error ? 5000 : 5500,
    );
  }, [actionState, message, noScroll, setShow, collapse, error]);

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
    message,
    classes,
    Icon,
  };

  const NoticeIcon = last?.Icon ?? Icon;
  return (
    <div
      className={
        "notice" + (last?.classess ?? classes) + (show ? "" : " collapsed")
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
      <span>{last?.message ?? message}</span>
    </div>
  );
}
