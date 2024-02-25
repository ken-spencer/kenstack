"use client";

import { useState, useEffect } from "react";
import { DateTime } from "luxon";
import Tooltip from "@mui/material/Tooltip";

export default function RelativeDate(props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(true);
  }, []);
  if (!props.value) {
    return;
  }

  const date = DateTime.fromISO(props.value);
  const format = date.toFormat("MMMM dd, yyyy, h:mm a");
  return (
    <Tooltip title={show && format}>
      <span suppressHydrationWarning>{date.toRelative()}</span>
    </Tooltip>
  );
}
