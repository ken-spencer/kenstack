import { useRef, useEffect } from "react";

import Dialog from "@kenstack/components/Dialog";
import DialogTitle from "@kenstack/components/Dialog/DialogTitle";
import DialogBody from "@kenstack/components/Dialog/DialogBody";
import DialogActions from "@kenstack/components/Dialog/DialogActions";

import Button from "@kenstack/forms/Button";

import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

export default function Confirm({
  confirm = false,
  action = null,
  onClose = null,
  message = "",
}) {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (confirm) {
      // ref isn't availible right away in a portal
      setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.focus();
        }
      }, 10);
    }
  }, [confirm]);

  return (
    <Dialog open={confirm ? true : false} onClose={onClose}>
      <DialogTitle>Confirm</DialogTitle>
      <DialogBody>{message}</DialogBody>
      <DialogActions>
        <Button color="cancel" onClick={onClose} startIcon={<CloseIcon />}>
          Cancel
        </Button>

        <Button
          // autoFocus
          ref={buttonRef}
          startIcon={<DeleteIcon />}
          type="button"
          onClick={() => {
            if (typeof confirm === "function") {
              confirm();
            }
            if (action) {
              action();
            }
            onClose();
          }}
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
