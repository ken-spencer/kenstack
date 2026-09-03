"use client";

import { useRouter } from "next/navigation";

import schema from "@kenstack/auth/schemas/resetPassword";
import Form from "@kenstack/forms/Form";
import PasswordField from "@kenstack/forms/PasswordField";
import Submit from "@kenstack/forms/Submit";

const defaultValues = {
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordForm({
  requiresCurrentPassword = false,
}: {
  requiresCurrentPassword?: boolean;
}) {
  const router = useRouter();
  return (
    <Form
      className="w-full max-w-lg space-y-4"
      apiPath="/api/auth"
      schema={schema}
      defaultValues={
        requiresCurrentPassword
          ? { ...defaultValues, currentPassword: "" }
          : defaultValues
      }
      onSubmit={async ({ data, mutation, form }) => {
        if (
          (
            await mutation.mutateAsync({
              ...data,
              action: "reset-password",
            })
          ).status === "success"
        ) {
          form.reset();
          router.refresh();
        }
      }}
    >
      {requiresCurrentPassword ? (
        <PasswordField name="currentPassword" label="Current password" />
      ) : null}
      <PasswordField name="password" label="New password" />
      <PasswordField name="confirmPassword" label="Confirm new password" />
      <Submit>Set password</Submit>
    </Form>
  );
}
