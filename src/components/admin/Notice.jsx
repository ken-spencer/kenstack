import { useEffect, useState, useRef } from "react";
import Alert from "@mui/material/Alert";
import Fade from "@mui/material/Fade";
import Collapse from "@mui/material/Collapse";

export default function Notice({ formState, noScroll = false }) {
  const [show, setShow] = useState(false);
  // const [display, setDisplay] = useState(false);
  const timeout = useRef();
  const ref = useRef();
  // const lastState = useRef();

  const hasNotice = formState?.error || formState.success;

  useEffect(() => {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = null;
    }

    if (!formState?.error && !formState?.success) {
      return;
    }

    setShow(true);
    // setDisplay(true);
    if (ref.current && noScroll == false) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }

    timeout.current = setTimeout(
      () => {
        setShow(false);
      },
      formState.error ? 5000 : 2500,
    );
  }, [formState, noScroll]);

  if (!hasNotice) {
    return null;
  }

  const handleExit = () => {
    // setDisplay(false);
  };

  return (
    <Collapse timeout={300} in={show}>
      <Fade timeout={300} in={show} onExited={handleExit}>
        <Alert
          ref={ref}
          sx={{ scrollMarginTop: "75px" }}
          severity={formState.error ? "error" : "success"}
          variant={formState.error ? "filled" : "outlined"}
        >
          {formState?.error || formState?.success}
        </Alert>
      </Fade>
    </Collapse>
  );
}
