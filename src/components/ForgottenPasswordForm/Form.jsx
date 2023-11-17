"use client";
// import { useEffect, useState } from "react";
import Link from "next/link";
// import Cookies from "js-cookie";

import { Form, TextField, Submit } from "@thaumazo/forms";
import Notice from "../Notice";

import styles from "./form.module.css";

export default function FPForm() {
  /*
  const [errorMessage, setErrorMessage] = useState();
  useEffect(() => {
    const error = Cookies.get("forgottenPasswordApiError");
    if (error !== undefined) {
      setErrorMessage(error);
      Cookies.remove("forgottenPasswordApiError");
    }
  }, []);
  */

  return (
    <Form className={styles.container}>
      <div className={styles.item}>
        <p>
          Enter your email below and a link will be sent to reset your password.
        </p>
      </div>

      <div className={styles.errorItem}>
        <Notice name="forgottenPasswordApiError" />
      </div>

      <div className={styles.item}>
        <TextField name="email" type="email" required />
      </div>
      <div className={styles.item}>
        <Submit fullWidth>Request link</Submit>
      </div>
      <div className={styles.item}>
        <Link href="/login">Return to login</Link>
      </div>
    </Form>
  );
}
