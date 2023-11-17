import "server-only";

import { Provider, ThemeProvider } from "@thaumazo/forms";
import Form from "./Form";

import resetPasswordAction from "../../auth/resetPasswordAction";

export default function ResetPassword() {
  return (
    <ThemeProvider theme="auto">
      <Provider action={resetPasswordAction}>
        <Form />
      </Provider>
    </ThemeProvider>
  );
}
