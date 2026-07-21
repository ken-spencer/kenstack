"use client";

import Form from "@kenstack/forms/Form";
import schema from "@kenstack/auth/schemas/resetPassword";
import Notice from "@kenstack/forms/Notice";
import PasswordField from "@kenstack/forms/PasswordField";
import { useRouter, usePathname } from "next/navigation";

import Submit from "@kenstack/forms/Submit";

const defaultValues = {
  password: "",
  confirmPassword: "",
};

export default function ResetPasswordForm({
  requiresCurrentPassword = false,
  token,
}: {
  requiresCurrentPassword?: boolean;
  token?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
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
        return mutation
          .mutateAsync({ ...data, token, action: "reset-password" })
          .then((res) => {
            if ("success" === res.status) {
              form.reset();
              router.replace(pathname);
              router.refresh();
            }
          });
      }}
    >
      <Notice />
      {requiresCurrentPassword ? (
        <PasswordField name="currentPassword" label="Current password" />
      ) : null}
      <PasswordField name="password" label="New password" />
      <PasswordField name="confirmPassword" label="Confirm new password" />
      <Submit>Submit</Submit>
    </Form>
  );
}
