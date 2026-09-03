import type { EmailLoginVerificationResult } from "@kenstack/auth/api";
import { loginCodeSchema } from "@kenstack/auth/email/login/schemas";
import type { StatusMessage } from "@kenstack/forms/context";

import VerificationCodeField from "@kenstack/auth/components/VerificationCodeField";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import Form from "@kenstack/forms/Form";
import Submit from "@kenstack/forms/Submit";

import {
  resolveReturnTo,
  type Continuation,
  useCompleteLogin,
} from "./continuation";
import LinkButton from "./LinkButton";

export default function LoginCodeForm({
  challengeKey,
  continuation,
  email,
  onResend,
  onShowEmailLogin,
  statusMessage,
}: {
  challengeKey: string | null;
  continuation: Continuation;
  email: string;
  onResend: (challengeKey: string) => void;
  onShowEmailLogin: () => void;
  statusMessage?: StatusMessage;
}) {
  const completeLogin = useCompleteLogin(continuation);
  // A null key means a send or resend is in flight: a code entered now would
  // verify against a challenge the server has already replaced.
  const isSending = challengeKey === null;

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="text-sm">
        {isSending ? (
          <>
            Sending an email to <strong>{email}</strong>…
          </>
        ) : (
          <>
            We sent an email to <strong>{email}</strong>. Open the link in the
            email or enter its six-digit code below. It may take a minute to
            arrive — check your spam or junk folder if you don’t see it.
          </>
        )}
      </p>
      <Form<
        EmailLoginVerificationResult,
        Record<string, unknown>,
        typeof loginCodeSchema
      >
        className="w-full space-y-4"
        apiPath="/api/auth"
        key={challengeKey ?? "sending"}
        schema={loginCodeSchema}
        defaultValues={{ code: "" }}
        initialStatusMessage={statusMessage}
        onSubmit={({ data, mutation }) => {
          if (challengeKey === null) {
            return;
          }

          mutation.mutate(
            {
              action: "verify-email-login-code",
              challengeKey,
              code: data.code,
              returnTo: resolveReturnTo(continuation),
            },
            {
              onSuccess: (res) => {
                if (res.status === "success") {
                  completeLogin(res.path, res.authState);
                }
              },
            },
          );
        }}
      >
        <VerificationCodeField disabled={isSending} name="code" />
        {continuation.mode === "embedded" ? (
          <StepActions next={{ disabled: isSending, label: "Continue" }} />
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          {continuation.mode === "embedded" ? null : (
            // Standalone keeps Continue inside the links row, which
            // LoginSubmit's layout cannot express.
            <Submit className="order-last ml-auto" disabled={isSending}>
              Continue
            </Submit>
          )}
          <LinkButton
            disabled={isSending}
            onClick={() => {
              if (challengeKey !== null) {
                onResend(challengeKey);
              }
            }}
          >
            Resend email
          </LinkButton>
          <LinkButton onClick={onShowEmailLogin}>
            Use a different email
          </LinkButton>
        </div>
      </Form>
    </div>
  );
}
