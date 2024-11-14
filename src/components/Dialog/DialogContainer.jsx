import { useEffect, useRef } from "react";

import "./dialog.scss";
// Modal component

const dialogs = [];
// const zIndex = 50;

export default function Dialog({
  className = null,
  open = false,
  children = null,
  onClose = null,
  onShow = null,
  // variant = "small", // small | large
}) {
  const ref = useRef();
  // unique identifier for dialog;
  const id = useRef(Date.now());

  useEffect(() => {
    const dialog = ref.current;

    // always fires when dislog closes
    const handleClose = () => {};

    // close when clicking backdrop
    const handleBackdropClick = (evt) => {
      if (evt.target === dialog && onClose) {
        onClose();
      }
    };

    // escape key was pressed
    const handleCancel = (evt) => {
      // oncly close the top dialog
      if (dialogs[dialogs.length - 1] !== id.current) {
        evt.preventDefault();
      } else if (onClose) {
        onClose();
      }
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("click", handleBackdropClick);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("click", handleBackdropClick);
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  useEffect(() => {
    if (open) {
      ref.current.showModal();
      dialogs.push(id.current);
      // used to focus on buttons
      if (onShow) {
        onShow();
      }
    } else {
      ref.current.close();
      dialogs.pop();
    }
  }, [open, onShow]);

  let classes = "admin-dialog";
  classes += className ? " " + className : "";
  // classes += variant ? " " + styles[variant] : "";

  return (
    <dialog ref={ref} className={classes} style={{ zIndex: dialogs.length }}>
      {children}
    </dialog>
  );
}
