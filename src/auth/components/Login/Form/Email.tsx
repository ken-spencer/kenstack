import { requestEmailLoginSchema } from "@kenstack/auth/email/login/schemas";
import type { StatusMessage } from "@kenstack/forms/context";

import Form from "@kenstack/forms/Form";
import InputField from "@kenstack/forms/InputField";

import type { Continuation } from "./continuation";
import LinkButton from "./LinkButton";
import LoginSubmit from "./LoginSubmit";

export default function EmailLoginForm({
  autoFocus,
  continuation,
  emailDefaultValue,
  onEmailLogin,
  onShowPasswordLogin,
  statusMessage,
}: {
  autoFocus: boolean;
  continuation: Continuation;
  emailDefaultValue: string;
  onEmailLogin: (email: string) => void;
  onShowPasswordLogin: (form: HTMLFormElement | null) => void;
  statusMessage?: StatusMessage;
}) {
  return (
    <Form
      className="w-full space-y-4"
      schema={requestEmailLoginSchema}
      defaultValues={{ email: emailDefaultValue }}
      initialStatusMessage={statusMessage}
      onSubmit={({ data }) => {
        onEmailLogin(data.email);
      }}
    >
      <InputField
        autoFocus={autoFocus}
        name="email"
        label="Email"
        type="email"
      />
      <LoginSubmit continuation={continuation} label="Email me a code">
        <LinkButton
          onClick={({ currentTarget }) =>
            onShowPasswordLogin(currentTarget.form)
          }
        >
          Use a password instead
        </LinkButton>
      </LoginSubmit>
    </Form>
  );
}
