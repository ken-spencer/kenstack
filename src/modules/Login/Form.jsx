"use client";

import { useCallback } from "react";
import AutoForm from "@admin/forms/AutoForm";
import fields from "./fields";
import Submit from "./Submit";

import apiAction from "@admin/client/apiAction";
import { useLogin } from "./context";

export default function LoginForm() {
  const { apiPath } = useLogin();
  const handleSubmit = useCallback(
    (state, formData) => {
      return apiAction(apiPath, formData);
    },
    [apiPath],
  );

  return (
    <div style={{ maxWidth: "500px", width: "100%" }}>
      <AutoForm
        // title="Login"
        name="loginError"
        fields={fields}
        // action={loginAction}
        action={handleSubmit}
        buttons={Submit}
        submit="Login"
      />
    </div>
  );
}
