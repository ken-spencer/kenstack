import { requestEmailLoginSchema } from "@kenstack/auth/email/login/schemas";
import type { StatusMessage } from "@kenstack/forms/context";

import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
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
  onEmailLogin: (email: string) => Promise<void>;
  onShowPasswordLogin: (form: HTMLFormElement | null) => void;
  statusMessage?: StatusMessage;
}) {
  return (
    <Form
      className="w-full space-y-4"
      schema={requestEmailLoginSchema}
      defaultValues={{ email: emailDefaultValue }}
      initialStatusMessage={statusMessage}
      // Awaited, so the button shows the send pending.
      onSubmit={({ data }) => onEmailLogin(data.email)}
    >
      <InputField
        autoFocus={autoFocus}
        name="email"
        label="Email"
        readOnly={continuation.mode === "reauthentication"}
        type="email"
      />
      <LoginSubmit continuation={continuation} label="Email me a code">
        <LinkButton
          onClick={({ currentTarget }) =>
            onShowPasswordLogin(currentTarget.form)
          }
        >
          I have a password
        </LinkButton>
      </LoginSubmit>
      {/* Sending the email requests a reCAPTCHA token. */}
      <RecaptchaTerms />
    </Form>
  );
}
