"use client";
import { useCallback } from "react";

import AutoForm from "@admin/forms/AutoForm";
import Submit from "./Submit";
import fields from "./fields";

import apiAction from "@admin/client/apiAction";
import { useForgottenPassword } from "./context";

export default function ForgottenPasswordForm({ action }) {
  const { apiPath } = useForgottenPassword();
  const handleSubmit = useCallback(
    (state, formData) => {
      return apiAction(apiPath, formData);
    },
    [apiPath],
  );

  return (
    <AutoForm
      action={handleSubmit}
      name="forgottenPassword"
      fields={fields}
      // title="Reset your password"
      // description="Enter your email below and a link will be sent to reset your password."
      buttons={Submit}
    />
  );
}
