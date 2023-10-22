"use client";
// import Link from 'next/link';

import {
  ThemeProvider,
  Form,
  Password,
  ConfirmPassword,
  Submit,
} from "@thaumazo/forms";

import useFormHandler from "forms/useFormHandler";

// import AlertTitle from '@mui/material/AlertTitle';

import styles from "./form.module.css";

export default function LoginForm() {
  const { notice, handleSubmit } = useFormHandler("/reset-password/api");

  return (
    <ThemeProvider theme="auto">
      <Form onSubmit={handleSubmit} className={styles.container}>
        <div className={styles.item}>
          <p>
            Type your new password here. Make sure it has at least 8 characters.
            It should have both big and small letters and also a number.
          </p>
        </div>

        {notice && <div className={styles.errorItem}>{notice}</div>}

        <div className={styles.item}>
          <Password name="password" required />
        </div>

        <div className={styles.item}>
          <ConfirmPassword />
        </div>
        <div className={styles.item}>
          <Submit fullWidth>Request link</Submit>
        </div>
      </Form>
    </ThemeProvider>
  );
}
