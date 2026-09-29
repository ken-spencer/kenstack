import { useEffect, useEffectEvent } from "react";

import type { EmailLoginVerificationResult } from "@kenstack/auth/api";
import { loginCodeSchema } from "@kenstack/auth/email/login/schemas";
import { verificationEndedCode } from "@kenstack/auth/email/verification/internal/policy";
import type { StatusMessage } from "@kenstack/forms/context";

import VerificationCodeField from "@kenstack/auth/components/VerificationCodeField";
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
import Form from "@kenstack/forms/Form";
import Submit from "@kenstack/forms/Submit";

import {
  resolveReturnTo,
  type Continuation,
  useCompleteLogin,
  useReauthenticationAccount,
} from "./continuation";
import LinkButton from "./LinkButton";

export default function LoginCodeForm({
  challengeKey,
  continuation,
  email,
  isResending,
  onResend,
  onShowEmailLogin,
  statusMessage,
}: {
  challengeKey: string;
  continuation: Continuation;
  email: string;
  isResending: boolean;
  onResend: (challengeKey: string) => void;
  onShowEmailLogin: (message?: string) => void;
  statusMessage?: StatusMessage;
}) {
  const completeLogin = useCompleteLogin(continuation);
  const account = useReauthenticationAccount(continuation);
  const { cancel, replay } = useAuthorization();
  // The emailed link, opened in another tab, confirms this browser, so coming back to this tab tries
  // the held change again. The server decides, and a refusal changes nothing here.
  const retryHeld = useEffectEvent(() => replay());
  useEffect(() => {
    if (continuation.mode !== "reauthentication") {
      return;
    }
    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") {
        retryHeld();
      }
    };
    window.addEventListener("focus", retryWhenVisible);
    document.addEventListener("visibilitychange", retryWhenVisible);
    return () => {
      window.removeEventListener("focus", retryWhenVisible);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [continuation.mode]);

  return (
    <div className="space-y-4">
      <p aria-live="polite" className="text-sm">
        Enter the six-digit code we sent to <strong>{email}</strong>. You can
        also open the link in the email
        {continuation.mode === "reauthentication"
          ? ", then come back to this tab"
          : ""}
        . It may take a minute to arrive — check your spam or junk folder if you
        don’t see it.
      </p>
      <Form<
        EmailLoginVerificationResult,
        Record<string, unknown>,
        typeof loginCodeSchema
      >
        className="w-full space-y-4"
        apiPath="/api/auth"
        key={challengeKey}
        schema={loginCodeSchema}
        defaultValues={{ code: "" }}
        initialStatusMessage={statusMessage}
        onSubmit={({ data, mutation }) => {
          // A code entered during a resend would verify against a challenge the server is replacing.
          if (isResending) {
            return;
          }

          mutation.mutate(
            {
              action: "verify-email-login-code",
              challengeKey,
              code: data.code,
              returnTo: resolveReturnTo(continuation),
              ...(account.userId === undefined
                ? {}
                : { email, userId: account.userId }),
            },
            {
              onSuccess: (res) => {
                account.reloadIfChanged(res);
                if (res.status === "success") {
                  completeLogin(res.path, res.authState);
                } else if (res.code === verificationEndedCode) {
                  onShowEmailLogin(
                    res.message ??
                      "That request has ended. Enter your email to start again.",
                  );
                }
              },
            },
          );
        }}
      >
        <VerificationCodeField disabled={isResending} name="code" />
        <div className="flex flex-wrap items-center gap-4">
          {/* Continue sits inside the links row, which LoginSubmit's layout cannot express. */}
          <Submit className="order-last ml-auto" disabled={isResending}>
            Continue
          </Submit>
          <LinkButton
            disabled={isResending}
            onClick={() => onResend(challengeKey)}
          >
            Resend email
          </LinkButton>
          {continuation.mode === "reauthentication" ? (
            <LinkButton onClick={cancel}>Cancel</LinkButton>
          ) : (
            <LinkButton onClick={() => onShowEmailLogin()}>
              Use a different email
            </LinkButton>
          )}
        </div>
      </Form>
      {/* Resending the email requests a reCAPTCHA token. */}
      <RecaptchaTerms />
    </div>
  );
}
