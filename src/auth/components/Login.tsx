"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Link from "next/link";

import Form from "@kenstack/forms/Form";
import loginSchema from "@kenstack/auth/schemas/login";
import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import Notice from "@kenstack/forms/Notice";
import Alert from "@kenstack/components/Alert";
import InputField from "@kenstack/forms/InputField";
import PasswordField from "@kenstack/forms/PasswordField";

import Submit from "@kenstack/forms/Submit";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";

const loginDefaultValues = {
  email: "",
  password: "",
};

export function LoginForm() {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [isMessageCleared, setIsMessageCleared] = useState(false);

  return (
    <Form
      className="space-y-4"
      apiPath="/api/auth"
      schema={loginSchema}
      defaultValues={loginDefaultValues}
      onSubmit={async ({ data, mutation, form }) => {
        setIsMessageCleared(true);
        const recaptchaToken = executeRecaptcha
          ? await executeRecaptcha("login")
          : null;
        const returnTo =
          getSafeReturnToPath(
            new URLSearchParams(window.location.search).get("returnTo"),
          ) ?? "";
        return mutation
          .mutateAsync({ ...data, returnTo, recaptchaToken, action: "login" })
          .then((res) => {
            if (res.status === "success") {
              form.reset();
              if (typeof res.path === "string") {
                router.push(res.path);
              }
              router.refresh();
            }
          });
      }}
    >
      <Suspense fallback={null}>
        <LoginMessage isCleared={isMessageCleared} />
      </Suspense>
      <Notice />
      <InputField name="email" label="Email" type="email" autoFocus />
      <PasswordField name="password" label="Password" />

      <div className="flex items-center justify-between">
        <Submit>Login</Submit>
        <Link href="/forgot-password">Forgot Your Password?</Link>
      </div>

      <RecaptchaTerms />
    </Form>
  );
}

function LoginMessage({ isCleared }: { isCleared: boolean }) {
  const searchParams = useSearchParams();
  const loginMessage = searchParams.get("loginMessage") ?? "";
  const [message] = useState(loginMessage);

  useEffect(() => {
    if (!loginMessage) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    params.delete("loginMessage");
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (params.size ? `?${params}` : ""),
    );
  }, [loginMessage]);

  if (isCleared || !message) {
    return null;
  }

  return <Alert>{message}</Alert>;
}

export default LoginForm;
