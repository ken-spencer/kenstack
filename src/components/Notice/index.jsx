"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

import Alert from "@mui/material/Alert";
import Fade from "@mui/material/Fade";
import Notice from "@kenstack/forms/Notice";

import styles from "./notice.module.css";

export default function NoticeWrapper({ name, error, ...props }) {
  const [errorMessage, setErrorMessage] = useState(error);

  useEffect(() => {
    const err = Cookies.get(name);
    if (err !== undefined) {
      setErrorMessage(err);
      Cookies.remove(name);
    }
  }, [name]);

  if (errorMessage) {
    return (
      <Fade in={true}>
        <Alert className={styles.notice} severity="error">
          {errorMessage}
        </Alert>
      </Fade>
    );
  }

  return <Notice className={styles.notice} {...props} />;
}
