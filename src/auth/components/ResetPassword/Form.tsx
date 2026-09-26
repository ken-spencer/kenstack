"use client";

import { useRouter } from "next/navigation";

import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import schema from "@kenstack/auth/schemas/resetPassword";
import Form from "@kenstack/forms/Form";
import PasswordField from "@kenstack/forms/PasswordField";
import Submit from "@kenstack/forms/Submit";

const defaultValues = {
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordForm() {
  const router = useRouter();
  const authorization = useAuthorization();
  return (
    <Form
      className="w-full max-w-lg space-y-4"
      apiPath="/api/auth"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={async ({ data, mutation, form }) => {
        const result = await authorization
          .track(mutation.mutateAsync({ ...data, action: "reset-password" }), {
            rotatesSession: true,
          })
          // The form's mutation already reported the failure.
          .catch(() => undefined);
        if (result?.status === "success") {
          form.reset();
          router.refresh();
        }
      }}
    >
      <PasswordField name="password" label="New password" />
      <PasswordField name="confirmPassword" label="Confirm new password" />
      <Submit>Set password</Submit>
    </Form>
  );
}
