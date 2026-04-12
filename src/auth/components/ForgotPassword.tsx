"use client";

import { Suspense, useState } from "react";

import Link from "next/link";

import Form from "@kenstack/forms/Form";
import schema from "@kenstack/auth/schemas/forgotPassword";
import Notice from "@kenstack/forms/Notice";
import InputField from "@kenstack/forms/InputField";
import Alert from "@kenstack/components/Alert";
import cookies from "js-cookie";

import Submit from "@kenstack/forms/Submit";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
import { useSearchParams } from "next/navigation";

const defaultValues = {
  email: "",
};

export default function ForgotPasswordFormCont() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [message, setMessage] = useState(() => {
    if (typeof window === "undefined") {
      return;
    }
    let m;
    if ((m = searchParams.get("forgottenPasswordMessage"))) {
      window.history.replaceState(null, "", window.location.pathname);
    } else if ((m = cookies.get("forgottenPasswordMessage"))) {
      if (m) {
        cookies.remove("forgottenPassword");
      }
    }
    return m;
  });

  return (
    <Form
      className="max-w-lg space-y-4"
      apiPath="/api/auth"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={async ({ data, mutation, form }) => {
        setMessage("");
        const recaptchaToken = executeRecaptcha
          ? await executeRecaptcha("forgottenPassword")
          : null;
        return mutation
          .mutateAsync({
            ...data,
            recaptchaToken,
            _action: "forgot-password",
          })
          .then((res) => {
            if ("success" === res.status) {
              form.reset();
            }
          });
      }}
    >
      {message && <Alert>{message}</Alert>}
      <Notice />
      <InputField
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email address"
      />

      <div className="flex justify-between">
        <Submit>Submit</Submit>
        <Link href="/login">Return to Login?</Link>
      </div>

      <RecaptchaTerms />
    </Form>
  );
}
