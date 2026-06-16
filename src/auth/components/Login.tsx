"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import cookies from "js-cookie";

import Link from "next/link";

import Form from "@kenstack/forms/Form";
import loginSchema from "@kenstack/auth/schemas/login";
import { getSafeReturnToPath } from "@kenstack/auth/returnTo";
import Notice from "@kenstack/forms/Notice";
import Alert from "@kenstack/components/Alert";
import InputField from "@kenstack/forms/InputField";
import PasswordField from "@kenstack/forms/PasswordField";
import RegisterField from "@kenstack/forms/RegisterField";

import Submit from "@kenstack/forms/Submit";
import Suspense from "@kenstack/components/Suspense";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";

const loginDefaultValues = {
  email: "",
  password: "",
  returnTo: "",
};

export default function LoginFormCont() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const returnTo = getSafeReturnToPath(searchParams.get("returnTo")) ?? "";

  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") {
      return;
    }

    let m;
    if ((m = searchParams.get("loginMessage"))) {
      const params = new URLSearchParams(window.location.search);
      params.delete("loginMessage");
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (params.size ? `?${params}` : ""),
      );
    } else if ((m = cookies.get("loginMessage"))) {
      cookies.remove("loginMessage", { path: "/login" });
    }
    return m;
  });

  return (
    <Form
      className="space-y-4"
      apiPath="/api/auth"
      schema={loginSchema}
      defaultValues={{ ...loginDefaultValues, returnTo }}
      key={returnTo}
      onSubmit={async ({ data, mutation, form }) => {
        setMessage("");
        const recaptchaToken = executeRecaptcha
          ? await executeRecaptcha("login")
          : null;
        return mutation
          .mutateAsync({ ...data, recaptchaToken, action: "login" })
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
      {message && <Alert>{message}</Alert>}
      <Notice />
      <RegisterField name="returnTo" />
      <InputField name="email" label="Email" type="email" />
      <PasswordField name="password" label="Password" />

      <div className="flex items-center justify-between">
        <Submit>Login</Submit>
        <Link href="/forgot-password">Forgot Your Password?</Link>
      </div>

      <RecaptchaTerms />
    </Form>
  );
}
