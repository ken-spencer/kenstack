"use client";

import { Suspense, useEffect, useRef, useState } from "react";

import Link from "next/link";

import Form from "@kenstack/forms/Form";
import schema from "@kenstack/auth/schemas/forgotPassword";
import InputField from "@kenstack/forms/InputField";
import Alert from "@kenstack/components/Alert";
import { deleteCookie, getCookie } from "@kenstack/lib/cookies";

import Submit from "@kenstack/forms/Submit";
import Progress from "@kenstack/components/Progress";

import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
import { useSearchParams } from "next/navigation";

const defaultValues = {
  email: "",
};

export default function ForgotPasswordFormCont() {
  return (
    <Suspense fallback={<Progress />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [message, setMessage] = useState<string>();
  const hasLoadedMessage = useRef(false);

  useEffect(() => {
    if (hasLoadedMessage.current) {
      return;
    }
    hasLoadedMessage.current = true;

    let nextMessage = searchParams.get("forgottenPasswordMessage") ?? undefined;
    if (nextMessage) {
      const params = new URLSearchParams(window.location.search);
      params.delete("forgottenPasswordMessage");
      window.history.replaceState(
        null,
        "",
        window.location.pathname + (params.size ? `?${params}` : ""),
      );
    } else {
      nextMessage = getCookie("forgottenPasswordMessage") ?? undefined;
      if (nextMessage) {
        deleteCookie("forgottenPasswordMessage", "/forgot-password");
      }
    }

    setMessage(nextMessage);
  }, [searchParams]);

  return (
    <Form
      className="w-full max-w-lg space-y-4"
      apiPath="/api/auth"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={async ({ data, mutation, form }) => {
        setMessage(undefined);
        const recaptchaToken = executeRecaptcha
          ? await executeRecaptcha("forgottenPassword")
          : null;
        return mutation
          .mutateAsync({
            ...data,
            recaptchaToken,
            action: "forgot-password",
          })
          .then((res) => {
            if ("success" === res.status) {
              form.reset();
            }
          });
      }}
    >
      {message && <Alert>{message}</Alert>}
      <InputField
        name="email"
        label="Email"
        type="email"
        placeholder="Enter your email address"
      />

      <div className="flex justify-between">
        <Submit>Send reset link</Submit>
        <Link href="/login">Return to login</Link>
      </div>

      <RecaptchaTerms />
    </Form>
  );
}
