"use client";
// import useFormHandler from "forms/useFormHandler";

import { Form } from "@thaumazo/forms";
import InnerForm from "./Inner";

import styles from "./form.module.css";

export default function LoginForm() {
  // const { handleSubmit, formAction } = useFormHandler(loginAction);

  return (
    <Form className={styles.container}>
      <InnerForm />
    </Form>
  );
}
