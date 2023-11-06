"use client";

import { Provider, ThemeProvider } from "@thaumazo/forms";
import Form from "./Form";
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
