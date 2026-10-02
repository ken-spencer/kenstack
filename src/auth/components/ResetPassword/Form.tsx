"use client";

import { useRouter } from "next/navigation";

import { postReauthentication } from "@kenstack/auth/reauthentication/channel";
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
  const { userId } = useAuthorization();
  return (
    <Form
      className="w-full max-w-lg space-y-4"
      apiPath="/api/auth"
      schema={schema}
      defaultValues={defaultValues}
      onSubmit={({ data, mutation }) =>
        mutation.mutate({ ...data, action: "reset-password" })
      }
      onSuccess={(_result, _variables, { form }) => {
        form.reset();
        router.refresh();
        if (userId !== undefined) {
          postReauthentication({ type: "saved", userId });
        }
      }}
    >
      <PasswordField name="password" label="New password" />
      <PasswordField name="confirmPassword" label="Confirm new password" />
      <Submit>Set password</Submit>
    </Form>
  );
}
