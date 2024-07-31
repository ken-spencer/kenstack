"use client";
// import { useEffect, useState } from "react";

import AutoForm from "@admin/forms/AutoForm";
import Submit from "./Submit";
import fields from "./fields";

import styles from "./form.module.css";

export default function FPForm({ action }) {
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
    <div className={styles.item}>
      <AutoForm
        action={action}
        name="forgottenPassword"
        fields={fields}
        title="Reset your password"
        description="Enter your email below and a link will be sent to reset your password."
        buttons={Submit}
      />
    </div>
  );
}
