import React, { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

import "./admin-icon.css";

export default function AdminIcon({
  className = "",
  component: Component = "button",
  children,
  tooltip = "",
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  type,
  disabled = false,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(true);
  }, []);

  const tooltipRef = useRef(null);
  const buttonRef = useRef();

  const pressTimer = useRef(null);
  const enterTimeout = useRef(null);
  const leaveTimeout = useRef(null);
  const longPressTriggered = useRef(false);

  const handleMouseDown = useCallback(
    (evt) => {
      longPressTriggered.current = false;
      pressTimer.current = setTimeout(() => {
        longPressTriggered.current = true;
        /*
        if (onLongPress) {
          onLongPress();
        }
        */
      }, 500);

      if (onMouseDown) {
        onMouseDown(evt);
      }
    },
    [onMouseDown],
  );

  const handleMouseUp = useCallback(
    (evt) => {
      clearTimeout(enterTimeout.current);
      enterTimeout.current = null;
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;

      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
        if (onClick && longPressTriggered.current === false) {
          onClick(evt);
        }
      }
      if (onMouseUp) {
        onMouseUp(evt);
      }
    },
    [onMouseUp, onClick],
  );

  const handleMouseEnter = useCallback(
    (evt) => {
      if (leaveTimeout.current) {
        clearTimeout(leaveTimeout.current);
        leaveTimeout.current = null;
        return;
      }

      enterTimeout.current = setTimeout(() => {
        const button = buttonRef.current;
        const tooltipNode = tooltipRef.current;
        const rect = button.getBoundingClientRect();

        const offset = tooltipNode.offsetWidth / 2 - button.offsetWidth / 2;
        tooltipNode.style.left = rect.left + window.scrollX - offset + "px";
        tooltipNode.style.top = rect.bottom + window.scrollY + 1 + "px";

        tooltipNode.classList.add("show-admin-tooltip");
      }, 1000);
      if (onMouseEnter) {
        onMouseEnter(evt);
      }
    },
    [onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (evt) => {
      if (!enterTimeout.current) {
        //  return;
      }

      clearTimeout(enterTimeout.current);
      enterTimeout.current = null;

      leaveTimeout.current = setTimeout(() => {
        tooltipRef.current.classList.remove("show-admin-tooltip");
        leaveTimeout.current = null;
      }, 500);
      if (onMouseLeave) {
        onMouseLeave(evt);
      }
    },
    [onMouseLeave],
  );

  if (Component === "button" && type === undefined) {
    type = "button";
  }

  return (
    <>
      <Component
        className={"admin-icon" + (className ? " " + className : "")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        ref={buttonRef}
        type={type}
        disabled={disabled}
        {...props}
      >
        {children}
      </Component>
      {tooltip &&
        loaded &&
        createPortal(
          <span className="admin-icon-tooltip" ref={tooltipRef}>
            {tooltip}
          </span>,
          document.body,
        )}
    </>
  );
}
