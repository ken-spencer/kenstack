import { useState } from "react";
import { useRouter } from "next/navigation";

import type { LoginActionResult } from "@kenstack/auth/api";
import { getLoginReturnPath } from "@kenstack/auth/returnTo";
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
  passwordPath,
  statusMessage,
}: {
  autoFocus?: "email" | "password";
  continuation: Continuation;
  emailDefaultValue: string;
  onShowEmailLogin: (form: HTMLFormElement | null) => void;
  passwordPath?: string;
  statusMessage?: StatusMessage;
}) {
  const completeLogin = useCompleteLogin(continuation);
  // A completed sign-in stays pending while the flow moves on or the page leaves. A confirmation
  // clears its password instead, since its dialog may ask again.
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();

  return (
    <Form<LoginActionResult, Record<string, unknown>, typeof loginSchema>
      className="w-full space-y-4"
      apiPath="/api/auth"
      recaptchaAction="login"
      schema={loginSchema}
      defaultValues={{ email: emailDefaultValue, password: "" }}
      initialStatusMessage={statusMessage}
      onSubmit={({ data, mutation, form }) => {
        mutation.mutate(
          {
            ...data,
            returnTo: resolveReturnTo(continuation),
            action: "login",
          },
          {
            onSuccess: (res) => {
              if (res.status === "success") {
                if (continuation.mode === "reauthentication") {
                  form.reset();
                } else {
                  setIsCompleting(true);
                }
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
        readOnly={continuation.mode === "reauthentication"}
        type="email"
      />
      <PasswordField
        autoFocus={autoFocus === "password"}
        name="password"
        label="Password"
      />

      <LoginSubmit
        continuation={continuation}
        isPending={isCompleting}
        label="Login"
        onForgotPassword={
          passwordPath
            ? (form) => {
                // The email sign-in is the forgot-password path: /login with the password page as
                // its return, keeping the email typed here. Back returns to this page.
                const email = form?.elements.namedItem("email");
                onShowEmailLogin(form);
                router.push(
                  `${getLoginReturnPath(passwordPath)}&email=${encodeURIComponent(
                    email instanceof HTMLInputElement ? email.value : "",
                  )}`,
                );
              }
            : undefined
        }
      >
        <LinkButton
          onClick={({ currentTarget }) => onShowEmailLogin(currentTarget.form)}
        >
          Email me a code instead
        </LinkButton>
      </LoginSubmit>
    </Form>
  );
}
