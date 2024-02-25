"use client";

import loginAction from "../../../auth/loginAction";
import AutoForm from "@thaumazo/forms/AutoForm";
import fields from "./fields";
import Submit from "./Submit";

export default function LoginForm() {
  return (
    <div style={{ maxWidth: "500px", width: "100%" }}>
      <AutoForm
        title="Login"
        name="loginError"
        fields={fields}
        action={loginAction}
        buttons={Submit}
        submit="Login"
      />
    </div>
  );
}
