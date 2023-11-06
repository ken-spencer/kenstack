"use client";

import { Provider, ThemeProvider } from "@thaumazo/forms";
import Form from "./Form";

export default function FPFormWrapper({ action }) {
  return (
    <ThemeProvider theme="auto">
      <Provider action={action}>
        <Form />
      </Provider>
    </ThemeProvider>
  );
}
