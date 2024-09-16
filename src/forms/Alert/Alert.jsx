import React, { forwardRef } from "react";

import styles from "./alert.module.scss";

function Alert(
  {
    severity = "error",
    success = null,
    error = null,
    className,
    children,
    ...props
  },
  ref,
) {
  const classes = [styles.alert];
  if (className) {
    classes.push(className);
  }

  let text = children;
  if (success) {
    severity = "success";
    if (!children) {
      text = success;
    }
  } else if (error) {
    severity = "error";
    if (!children) {
      text = error;
    }
  }

  switch (severity) {
    case "error":
    default:
      classes.push(styles.error);
      break;
    case "success":
      classes.push(styles.success);
      break;
  }

  return (
    <div {...props} ref={ref} className={classes.join(" ")}>
      <div className={styles.icon}>
        {(() => {
          switch (severity) {
            case "error":
              return <ErrorIcon />;
            case "success":
              return <SuccessIcon />;
          }
        })()}
      </div>
      <div className={styles.text}>{text}</div>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="1.5rem"
      height="1.5rem"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      width="1.5rem"
      height="1.5rem"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
      />
    </svg>
  );
}

export default forwardRef(Alert);
