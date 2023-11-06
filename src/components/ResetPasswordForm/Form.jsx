"use client";

import { Form, Password, Submit } from "@thaumazo/forms";
import Notice from "../Notice";

import styles from "./form.module.css";

export default function ResetPasswordForm() {
  return (
    <Form className={styles.container}>
      <div className={styles.item}>
        <p>
          Type your new password here. Make sure it has at least 8 characters.
          It should have both big and small letters and also a number.
        </p>
      </div>

      <div className={styles.errorItem}>
        <Notice />
      </div>

      <div className={styles.item}>
        <Password name="password" required />
      </div>

      <div className={styles.item}>
        <Password name="confirm_password" matches="password" />
      </div>
      <div className={styles.item}>
        <Submit fullWidth>Request link</Submit>
      </div>
    </Form>
  );
}
