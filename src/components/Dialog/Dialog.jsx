import { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";

import styles from "./dialog.module.scss";
// Modal component

const dialogs = [];
const zIndex = 50;

export default function Dialog({
  className = null,
  open = false,
  children = null,
  onClose = null,
  variant = "small", // small | large
}) {
  // unique identifier for dialog;
  const id = useRef(Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoaded(true);

    dialogs.push(id.current);
    const keyDown = (evt) => {
      if (evt.key !== "Escape") {
        return;
      }

      if (dialogs[dialogs.length - 1] === id.current) {
        dialogs.pop();
        if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", keyDown);
    return () => {
      window.removeEventListener("keydown", keyDown);
    };
  }, [open, onClose]);

  if (loaded === false || open === false) {
    return null;
  }

  let classes = styles.dialog;
  classes += className ? " " + className : "";
  classes += variant ? " " + styles[variant] : "";

  const z = zIndex + dialogs.length * 2;
  return ReactDOM.createPortal(
    <>
      <div className={classes} style={{ zIndex: z + 1 }}>
        {children}
      </div>
      <div
        onClick={onClose}
        className={styles.underlay}
        style={{ zIndex: z }}
      />
    </>,
    document.body,
  );
}
