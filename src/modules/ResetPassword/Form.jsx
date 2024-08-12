"use client";

import { useCallback } from "react";
import fields from "./fields";
import AutoForm from "@admin/forms/AutoForm";

import apiAction from "@admin/client/apiAction";

export default function ResetPasswordForm({ apiPath }) {
  const handleSubmit = useCallback(
    (state, formData) => {
      return apiAction(apiPath, formData);
    },
    [apiPath],
  );

  return (
    <AutoForm
      // title="Reset your password"
      /*
      description={
        <span>
          Type your new password here. Make sure it has at least 8 characters.
          It should have both big and small letters and also a number.
        </span>
      }
      */
      fields={fields}
      action={handleSubmit}
    />
  );
}
