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

export default function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Form
      className="max-w-lg space-y-4"
      apiPath="/api/auth"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={async ({ data, mutation, form }) => {
        return mutation
          .mutateAsync({ ...data, token, _action: "reset-password" })
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
      <PasswordField name="password" label="Password" />
      <PasswordField name="confirmPassword" label="Confirm Password" />
      <Submit>Submit</Submit>
    </Form>
  );
}
