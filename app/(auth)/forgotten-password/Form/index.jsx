"use client";
import Link from "next/link";

import { ThemeProvider, Form, TextField, Submit } from "@thaumazo/forms";
import useFormHandler from "forms/useFormHandler";

import styles from "./form.module.css";

export default function LoginForm() {
  const { notice, handleSubmit } = useFormHandler("/forgotten-password/api");

  return (
    <ThemeProvider theme="auto">
      <Form onSubmit={handleSubmit} className={styles.container}>
        <div className={styles.item}>
          <p>
            Enter your email below and a link will be sent to reset your
            password.
          </p>
        </div>

        {notice && <div className={styles.errorItem}>{notice}</div>}

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
    </ThemeProvider>
  );
}
