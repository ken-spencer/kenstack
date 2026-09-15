"use client";

import Link from "next/link";

import schema from "@kenstack/auth/schemas/forgotPassword";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
import Form from "@kenstack/forms/Form";
import InputField from "@kenstack/forms/InputField";
import Submit from "@kenstack/forms/Submit";

const defaultValues = {
  email: "",
};

export function ForgotPasswordForm() {
  return (
    <Form
      className="w-full max-w-lg space-y-4"
      apiPath="/api/auth"
      recaptchaAction="forgottenPassword"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={async ({ data, mutation, form }) => {
        if (
          (
            await mutation.mutateAsync({
              ...data,
              action: "forgot-password",
            })
          ).status === "success"
        ) {
          form.reset();
        }
      }}
    >
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

export default ForgotPasswordForm;
