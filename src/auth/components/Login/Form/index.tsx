"use client";

// Hosts and the Step adapter import this client entry point; sibling files are
// internal to the Login form, except LinkButton, which EmailChange shares, and
// useEmailLoginLink and AnsweredDialog, which the sign-in step's controller
// shares.
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import fetcher, { type FetchSuccess } from "@kenstack/api/fetcher";
import type {
  EmailLoginRequestResult,
  EmailLoginVerificationResult,
} from "@kenstack/auth/api";
import { requestEmailLoginSchema } from "@kenstack/auth/email/login/schemas";
import { verificationEndedCode } from "@kenstack/auth/email/verification/internal/policy";
import { setUserInfo } from "@kenstack/auth/useUserInfo";

import type { StatusMessage } from "@kenstack/forms/context";

import CookieTest from "@kenstack/components/CookieTest";
import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

import { rememberLoginMethod, type LoginMethod } from "../method";
import AnsweredDialog from "./AnsweredDialog";
import LoginCodeForm from "./Code";
import EmailLoginForm from "./Email";
import LinkButton from "./LinkButton";
import PasswordLoginForm from "./Password";
import useEmailLoginLink from "./useEmailLoginLink";
import {
  resolveReturnTo,
  type Continuation,
  useCompleteLogin,
} from "./continuation";

function LoginForm(
  props: {
    challengeKey?: string;
    email?: string;
    method?: LoginMethod;
    // "Forgot Your Password?" on the password form signs in by email, landing here on a standalone
    // form or a flow that ends with the login return step.
    passwordPath?: string;
  } & Continuation,
) {
  const emailParam = useSearchParams().get("email");
  const loginMessage = useConsumedSearchParam("loginMessage");
  const notice = useConsumedSearchParam("notice");
  // Only a standalone form verifies an emailed link: in a flow the sign-in
  // step's controller does, and a confirmation's link lands on /login's flow.
  const token = useConsumedSearchParam("token");

  return (
    <>
      <CookieTest />
      <LoginFormContent
        {...props}
        // The remembered method is the visitor's own choice, so a server render that reports it back,
        // such as a confirmation page refreshing, never resets a form in progress.
        key={[props.challengeKey, emailParam].join(":")}
        email={props.email ?? emailParam?.trim().toLowerCase() ?? ""}
        loginMessage={loginMessage}
        notice={notice}
        token={props.mode ? null : token}
      />
    </>
  );
}

function LoginFormContent({
  challengeKey: initialChallengeKey,
  email,
  loginMessage: initialLoginMessage,
  method: initialMethod,
  notice,
  passwordPath,
  token: searchToken,
  ...continuation
}: {
  challengeKey?: string;
  email: string;
  loginMessage: string | null;
  method?: LoginMethod;
  notice: string | null;
  passwordPath?: string;
  token: string | null;
} & Continuation) {
  const { mode } = continuation;
  const [challengeKey, setChallengeKey] = useState(initialChallengeKey);
  const [isResending, setIsResending] = useState(false);
  // A form that stays mounted through a failed send shows its error when it mounts again.
  const [failedSends, setFailedSends] = useState(0);
  const requestIdRef = useRef(0);
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    initialMethod ?? "email",
  );
  const [emailAddress, setEmailAddress] = useState(email);
  // An embedded or inline confirmation form takes focus only once the visitor
  // acts inside it.
  const [focusField, setFocusField] = useState<
    "email" | "password" | undefined
  >(mode ? undefined : "email");
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const token = searchToken === dismissedToken ? null : searchToken;
  const [statusMessage, setStatusMessage] = useState<StatusMessage | undefined>(
    initialLoginMessage
      ? { message: initialLoginMessage, status: "error" }
      : notice === "onboarding"
        ? {
            message:
              "Your account is ready. Confirm your email below and select “Email me a code” to finish signing in.",
            status: "information",
          }
        : undefined,
  );

  const completeLogin = useCompleteLogin(continuation);

  // The form that asked stays until the send completes, its button pending, and the code page then
  // shows in one change. A failed send shows its error where the request began. A result that a newer request has
  // superseded is dropped, so a stale send cannot pull the user back to the
  // code page.
  async function sendEmailCode(
    emailAddress: string,
    resendChallengeKey?: string,
  ) {
    const requestId = ++requestIdRef.current;
    const failureMessage = "We couldn’t send the email. Try again in a moment.";
    setEmailAddress(emailAddress);
    setIsResending(resendChallengeKey !== undefined);
    setStatusMessage(undefined);

    function showSendFailure(message: string) {
      setIsResending(false);
      setFailedSends((count) => count + 1);
      setStatusMessage({ message, status: "error" });
    }

    try {
      const result = await fetcher<EmailLoginRequestResult>(
        "/api/auth",
        {
          action: "email-login",
          challengeKey: resendChallengeKey,
          // A confirmation always sends its code, since its button promises one.
          confirmation: mode === "reauthentication" || undefined,
          email: emailAddress,
          // An embedded form's page hosts the link verifier, so the emailed
          // link can land there directly instead of on /login.
          linkToReturnTo: mode === "embedded" || undefined,
          returnTo: resolveReturnTo(continuation),
        },
        { recaptchaAction: "login" },
      );

      if (requestIdRef.current !== requestId) {
        return;
      }
      if (result.status === "error") {
        // A request the server no longer knows cannot continue from the code
        // page; the email page is the only place a new one starts.
        if (result.code === verificationEndedCode) {
          showEmailLogin(result.message ?? failureMessage);
          return;
        }
        showSendFailure(result.message ?? failureMessage);
        return;
      }
      if ("path" in result) {
        completeLogin(result.path, result.authState);
        return;
      }

      setIsResending(false);
      setChallengeKey(result.challengeKey);
      if (mode !== "reauthentication") {
        setUserInfo(result.authState);
      }
    } catch {
      if (requestIdRef.current === requestId) {
        showSendFailure(failureMessage);
      }
    }
  }

  function showEmailLogin(message?: string) {
    rememberLoginMethod("email");
    setLoginMethod("email");
    setChallengeKey(undefined);
    setDismissedToken(searchToken);
    setStatusMessage(message ? { message, status: "error" } : undefined);
  }

  if (token) {
    return (
      <LoginLinkContent
        continuation={continuation}
        token={token}
        onShowEmailLogin={showEmailLogin}
        onSuccess={({ path, authState }) => {
          completeLogin(path, authState);
        }}
      />
    );
  }

  function showLoginForm(method: LoginMethod, form: HTMLFormElement | null) {
    // A send still in flight belongs to the form being left.
    requestIdRef.current += 1;
    const emailInput = form?.elements.namedItem("email");
    const nextEmailAddress =
      emailInput instanceof HTMLInputElement ? emailInput.value : emailAddress;

    setEmailAddress(nextEmailAddress);
    setLoginMethod(method);
    rememberLoginMethod(method);
    // Continue where typing makes sense: a valid email moves focus to the
    // password; anything else returns to the email.
    setFocusField(
      method === "password" &&
        requestEmailLoginSchema.shape.email.safeParse(nextEmailAddress).success
        ? "password"
        : "email",
    );
  }

  return (
    <div className="w-full space-y-4">
      {challengeKey !== undefined ? (
        <LoginCodeForm
          challengeKey={challengeKey}
          continuation={continuation}
          email={emailAddress}
          isResending={isResending}
          key={failedSends}
          statusMessage={statusMessage}
          onResend={(activeChallengeKey) =>
            sendEmailCode(emailAddress, activeChallengeKey)
          }
          onShowEmailLogin={(message) => {
            requestIdRef.current += 1;
            setIsResending(false);
            setChallengeKey(undefined);
            setStatusMessage(
              message ? { message, status: "error" } : undefined,
            );
          }}
        />
      ) : loginMethod === "password" ? (
        <PasswordLoginForm
          autoFocus={focusField}
          continuation={continuation}
          emailDefaultValue={emailAddress}
          statusMessage={statusMessage}
          passwordPath={passwordPath}
          onShowEmailLogin={(form) => showLoginForm("email", form)}
        />
      ) : (
        <>
          {/* In a flow step, until the code form's own instructions take over. */}
          {mode === "embedded" ? (
            <p>We’ll email you a code to confirm your address.</p>
          ) : null}
          <EmailLoginForm
            autoFocus={focusField === "email"}
            key={failedSends}
            continuation={continuation}
            emailDefaultValue={emailAddress}
            statusMessage={statusMessage}
            onEmailLogin={sendEmailCode}
            onShowPasswordLogin={(form) => showLoginForm("password", form)}
          />
        </>
      )}
    </div>
  );
}

function LoginLinkContent({
  continuation,
  token,
  onShowEmailLogin,
  onSuccess,
}: {
  continuation: Continuation;
  token: string;
  onShowEmailLogin: (message?: string) => void;
  onSuccess: (result: FetchSuccess<EmailLoginVerificationResult>) => void;
}) {
  // Answered by a tab waiting on this sign-in, or a failure with nothing to return to; a failure the
  // email form can answer goes back to it with its message.
  const [outcome, setOutcome] = useState<"answered" | { message: string }>();
  useEmailLoginLink(token, {
    onAnswered: () => setOutcome("answered"),
    onFailure: ({ code, message }) => {
      if (code) {
        onShowEmailLogin(message);
      } else {
        setOutcome({ message });
      }
    },
    onSuccess,
    returnTo: () => resolveReturnTo(continuation),
  });

  if (outcome === "answered") {
    return <AnsweredDialog />;
  }
  if (outcome === undefined) {
    return (
      <p aria-live="polite" className="text-sm">
        Signing you in…
      </p>
    );
  }

  return (
    <div className="w-full space-y-4">
      <p role="alert" className="text-sm">
        {outcome.message}
      </p>
      <LinkButton onClick={() => onShowEmailLogin()}>
        Return to login
      </LinkButton>
    </div>
  );
}

export default LoginForm;
