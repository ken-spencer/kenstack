import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { EmailLoginVerificationResult } from "@kenstack/auth/api";
import { loginCodeSchema } from "@kenstack/auth/email/login/schemas";
import { verificationEndedCode } from "@kenstack/auth/email/verification/internal/policy";
import { getRenderedAccount } from "@kenstack/auth/renderedAccount";
import { useLoginDestination, useUserInfo } from "@kenstack/auth/useUserInfo";
import { normalizeEmail } from "@kenstack/fields/email";
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
} from "./continuation";
import LinkButton from "./LinkButton";
import { useAnswerSignInAsks } from "./signInChannel";

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
  // A completed sign-in stays pending while the flow moves on or the page leaves. A confirmation
  // stays usable, since its dialog may ask again.
  const [isCompleting, setIsCompleting] = useState(false);
  const { cancel, replay } = useAuthorization();
  // A page rendered for an account takes no other sign-in made elsewhere, so it answers only for
  // its own account's confirmation; any other page takes the sign-in when the visitor comes back.
  useAnswerSignInAsks(
    continuation.mode === "reauthentication" ||
      typeof getRenderedAccount() !== "number"
      ? email
      : null,
  );
  // When the visitor comes back, the user-info reload on focus adopts this form's sign-in if it was
  // finished elsewhere, such as by the emailed link, and names the account's destination. A
  // standalone form then goes where its own sign-in would, and an embedded one completes as its own
  // sign-in would, so a login step that always shows moves on too. A confirmation moves on through
  // its wrapper. A page rendered for an account adopts no other account's session and already shows
  // its own, so it never moves on for a sign-in made elsewhere. That is judged in the first effect,
  // once the page's account is recorded and before adopting a sign-in records a new one.
  const wasRenderedForAccount = useRef<boolean>(undefined);
  const userInfo = useUserInfo();
  const destination = useLoginDestination();
  const isSignedInElsewhere =
    (userInfo.state === "authenticated" || userInfo.state === "proven") &&
    userInfo.email === normalizeEmail(email);
  const moveOn = useEffectEvent((path: string) => {
    if (continuation.mode === "embedded") {
      continuation.onComplete();
    } else {
      window.location.assign(resolveReturnTo(continuation) || path);
    }
  });
  // A sign-in this form completed itself has already moved on.
  useEffect(() => {
    wasRenderedForAccount.current ??= typeof getRenderedAccount() === "number";
    if (
      continuation.mode !== "reauthentication" &&
      !wasRenderedForAccount.current &&
      isSignedInElsewhere &&
      !isCompleting
    ) {
      moveOn(destination ?? "/");
    }
  }, [continuation.mode, destination, isCompleting, isSignedInElsewhere]);
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
            },
            {
              onSuccess: (res) => {
                if (res.status === "success") {
                  setIsCompleting(continuation.mode !== "reauthentication");
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
          <Submit
            className="order-last ml-auto"
            disabled={isResending}
            isPending={isCompleting}
          >
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
