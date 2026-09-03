import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import type { LoginActionResult } from "@kenstack/auth/api";
import loginSchema from "@kenstack/auth/schemas/login";
import type { StatusMessage } from "@kenstack/forms/context";

import Form from "@kenstack/forms/Form";
import InputField from "@kenstack/forms/InputField";
import PasswordField from "@kenstack/forms/PasswordField";

import {
  resolveReturnTo,
  type Continuation,
  useCompleteLogin,
} from "./continuation";
import LinkButton from "./LinkButton";
import LoginSubmit from "./LoginSubmit";

export default function PasswordLoginForm({
  autoFocus,
  continuation,
  emailDefaultValue,
  onShowEmailLogin,
  statusMessage,
}: {
  autoFocus?: "email" | "password";
  continuation: Continuation;
  emailDefaultValue: string;
  onShowEmailLogin: (form: HTMLFormElement | null) => void;
  statusMessage?: StatusMessage;
}) {
  const { executeRecaptcha } = useGoogleReCaptcha();
  const completeLogin = useCompleteLogin(continuation);

  return (
    <Form<LoginActionResult, Record<string, unknown>, typeof loginSchema>
      className="w-full space-y-4"
      apiPath="/api/auth"
      schema={loginSchema}
      defaultValues={{ email: emailDefaultValue, password: "" }}
      initialStatusMessage={statusMessage}
      onSubmit={async ({ data, mutation, form }) => {
        mutation.mutate(
          {
            ...data,
            returnTo: resolveReturnTo(continuation),
            recaptchaToken: executeRecaptcha
              ? await executeRecaptcha("login")
              : null,
            action: "login",
          },
          {
            onSuccess: (res) => {
              if (res.status === "success") {
                form.reset();
                completeLogin(res.path, res.authState);
              }
            },
          },
        );
      }}
    >
      <InputField
        autoFocus={autoFocus === "email"}
        name="email"
        label="Email"
        type="email"
      />
      <PasswordField
        autoFocus={autoFocus === "password"}
        name="password"
        label="Password"
      />

      <LoginSubmit continuation={continuation} label="Login">
        <LinkButton
          onClick={({ currentTarget }) => onShowEmailLogin(currentTarget.form)}
        >
          Email me a code instead
        </LinkButton>
      </LoginSubmit>
    </Form>
  );
}
