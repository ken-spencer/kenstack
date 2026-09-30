"use client";

// Hosts and the Step adapter import this client entry point; sibling files are
// internal to the Login form, except LinkButton, which EmailChange shares.
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import fetcher, {
  type FetchError,
  type FetchSuccess,
} from "@kenstack/api/fetcher";
import type {
  EmailLoginRequestResult,
  EmailLoginVerificationResult,
} from "@kenstack/auth/api";
import {
  emailLoginLinkFailureCodeSchema,
  requestEmailLoginSchema,
  type EmailLoginLinkFailureCode,
} from "@kenstack/auth/email/login/schemas";
import { verificationEndedCode } from "@kenstack/auth/email/verification/internal/policy";
import { setUserInfo } from "@kenstack/auth/useUserInfo";

import QueryProvider from "@kenstack/context/QueryProvider";
import type { StatusMessage } from "@kenstack/forms/context";

import CookieTest from "@kenstack/components/CookieTest";
import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

import { rememberLoginMethod, type LoginMethod } from "../method";
import LoginCodeForm from "./Code";
import EmailLoginForm from "./Email";
import LinkButton from "./LinkButton";
import PasswordLoginForm from "./Password";
import {
  resolveReturnTo,
  type Continuation,
  useCompleteLogin,
  useReauthenticationAccount,
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
  // A hidden StepFlow step pauses effects, so an emailed link that lands on
  // another step waits in the URL until this step is shown.
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
        token={token}
      />
    </>
  );
}

function LoginFormContent({
  anchor,
  challengeKey: initialChallengeKey,
  email,
  loginMessage: initialLoginMessage,
  method: initialMethod,
  mode,
  notice,
  onComplete,
  passwordPath,
  token: searchToken,
}: {
  challengeKey?: string;
  email: string;
  loginMessage: string | null;
  method?: LoginMethod;
  notice: string | null;
  passwordPath?: string;
  token: string | null;
} & Continuation) {
  const [challengeKey, setChallengeKey] = useState(initialChallengeKey);
  const [isResending, setIsResending] = useState(false);
  // A form that stays mounted through a failed send shows its error when it mounts again.
  const [failedSends, setFailedSends] = useState(0);
  const requestIdRef = useRef(0);
  // The address's returnTo before "Forgot Your Password?" replaced it, restored when the visitor
  // goes back to the password form; undefined while nothing is replaced.
  const replacedReturnToRef = useRef<string | null>(undefined);
  const { executeRecaptcha } = useGoogleReCaptcha();
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

  const continuation: Continuation =
    mode === "embedded" ? { anchor, mode, onComplete } : { mode };
  const completeLogin = useCompleteLogin(continuation);
  const account = useReauthenticationAccount();

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
      const result = await fetcher<EmailLoginRequestResult>("/api/auth", {
        action: "email-login",
        challengeKey: resendChallengeKey,
        email: emailAddress,
        // An embedded form's page hosts the link verifier, so the emailed
        // link can land there directly instead of on /login.
        linkToReturnTo: mode === "embedded" || undefined,
        recaptchaToken: executeRecaptcha
          ? await executeRecaptcha("login")
          : null,
        returnTo: resolveReturnTo(continuation),
        userId: account.userId,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }
      account.reloadIfChanged(result);
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
      <QueryProvider>
        <LoginLinkContent
          continuation={continuation}
          token={token}
          onShowEmailLogin={showEmailLogin}
          onSuccess={({ path, authState }) => {
            completeLogin(path, authState);
          }}
        />
      </QueryProvider>
    );
  }

  function replaceReturnTo(returnTo: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (returnTo === null) {
      params.delete("returnTo");
    } else {
      params.set("returnTo", returnTo);
    }
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`,
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
    if (method === "password" && replacedReturnToRef.current !== undefined) {
      replaceReturnTo(replacedReturnToRef.current);
      replacedReturnToRef.current = undefined;
    }
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
          onForgotPassword={
            passwordPath
              ? (form) => {
                  // The email sign-in is the forgot-password path. The return path goes in the
                  // address, which the sign-in, its emailed link and a flow's return step all read,
                  // and which a reload keeps.
                  replacedReturnToRef.current = new URLSearchParams(
                    window.location.search,
                  ).get("returnTo");
                  replaceReturnTo(passwordPath);
                  showLoginForm("email", form);
                }
              : undefined
          }
          onShowEmailLogin={(form) => showLoginForm("email", form)}
        />
      ) : (
        <EmailLoginForm
          autoFocus={focusField === "email"}
          key={failedSends}
          continuation={continuation}
          emailDefaultValue={emailAddress}
          statusMessage={statusMessage}
          onEmailLogin={sendEmailCode}
          onShowPasswordLogin={(form) => showLoginForm("password", form)}
        />
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
  const failure = useEmailLoginLink(token, {
    onFailure: ({ code, message }) => {
      if (code) {
        onShowEmailLogin(message);
      }
    },
    onSuccess,
    returnTo: () => resolveReturnTo(continuation),
  });

  if (failure === null || failure.code) {
    return (
      <p aria-live="polite" className="text-sm">
        Signing you in…
      </p>
    );
  }

  return (
    <div className="w-full space-y-4">
      <p role="alert" className="text-sm">
        {failure.message}
      </p>
      <LinkButton onClick={() => onShowEmailLogin()}>
        Return to login
      </LinkButton>
    </div>
  );
}

type EmailLoginLinkFailure = {
  code?: EmailLoginLinkFailureCode;
  message: string;
};

const linkRequestFailureMessage =
  "We couldn’t finish signing you in. Try the link again.";

function toLinkFailure(result: FetchError): EmailLoginLinkFailure {
  const code = emailLoginLinkFailureCodeSchema.safeParse(result.code);

  return {
    code: code.success ? code.data : undefined,
    message: result.message ?? "We couldn’t finish signing you in.",
  };
}

// Each token is verified once; the callbacks and the returned failure follow
// only the latest token.
function useEmailLoginLink(
  token: string,
  {
    onFailure,
    onSuccess,
    returnTo,
  }: {
    onFailure: (failure: EmailLoginLinkFailure) => void;
    onSuccess: (result: FetchSuccess<EmailLoginVerificationResult>) => void;
    returnTo: () => string;
  },
) {
  const verification = useMutation({
    mutationFn: (activeToken: string) => {
      const path = returnTo();
      return fetcher<EmailLoginVerificationResult>("/api/auth", {
        action: "verify-email-login-link",
        ...(path ? { returnTo: path } : {}),
        token: activeToken,
      });
    },
  });
  const { mutateAsync } = verification;
  const startedTokenRef = useRef<string | null>(null);
  const fail = useEffectEvent(
    (activeToken: string, failure: EmailLoginLinkFailure) => {
      if (startedTokenRef.current === activeToken) {
        onFailure(failure);
      }
    },
  );
  const succeed = useEffectEvent(
    (
      activeToken: string,
      result: FetchSuccess<EmailLoginVerificationResult>,
    ) => {
      if (startedTokenRef.current === activeToken) {
        onSuccess(result);
      }
    },
  );

  useEffect(() => {
    if (startedTokenRef.current === token) {
      return;
    }

    startedTokenRef.current = token;
    // The promise settles even if a StepFlow step hides this form mid-flight
    // and pauses its subscriptions, which would drop observer callbacks.
    mutateAsync(token).then(
      (result) => {
        if (result.status === "success") {
          succeed(token, result);
        } else {
          fail(token, toLinkFailure(result));
        }
      },
      () => fail(token, { message: linkRequestFailureMessage }),
    );
  }, [mutateAsync, token]);

  if (verification.variables !== token) {
    return null;
  }
  if (verification.isError) {
    return { message: linkRequestFailureMessage };
  }
  if (verification.data?.status === "error") {
    return toLinkFailure(verification.data);
  }

  return null;
}

export default LoginForm;
