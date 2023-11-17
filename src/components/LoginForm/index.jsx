"use client";

import Form from "./Form";
import Provider from "@thaumazo/forms/Provider";
import ThemeProvider from "@thaumazo/forms/ThemeProvider";
import loginAction from "../../auth/loginAction";

export default function LoginForm() {
  return (
    <ThemeProvider theme="auto">
      <Provider action={loginAction}>
        <Form />
      </Provider>
    </ThemeProvider>
  );
}
