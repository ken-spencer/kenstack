"use client";
import Link from "next/link";

import { ThemeProvider, Form, TextField, Submit } from "@thaumazo/forms";

import styles from "./form.module.css";

export default function LoginForm() {
  return (
    <ThemeProvider theme="auto">
      <Form className={styles.container}>
        <div className={styles.item}>
          <h1>Login</h1>
        </div>
        <div className={styles.item}>
          <TextField name="email" type="email" required />
        </div>
        <div className={styles.item}>
          <TextField name="password" type="password" required />
        </div>
        <div className={styles.item}>
          <Submit fullWidth>Sign in</Submit>
        </div>
        <div className={styles.item}>
          <Link href="/forgotten-password">Forgotten your password?</Link>
        </div>
      </Form>
    </ThemeProvider>
  );
}
