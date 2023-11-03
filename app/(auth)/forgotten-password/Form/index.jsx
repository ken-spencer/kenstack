"use client";

import action from "./action";

import { Provider, ThemeProvider } from "@thaumazo/forms";
import Form from "./Form";

export default function FPFormWrapper() {
  return (
    <ThemeProvider theme="auto">
      <Provider action={action}>
        <Form />
      </Provider>
    </ThemeProvider>
  );
}
