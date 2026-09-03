"use client";

// Hosts and the Step adapter import this client entry point; sibling files are
// internal to the Login form.
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
import { setUserInfo } from "@kenstack/auth/useUserInfo";

import QueryProvider from "@kenstack/context/QueryProvider";
import type { StatusMessage } from "@kenstack/forms/context";

import CookieTest from "@kenstack/components/CookieTest";
import RecaptchaTerms from "@kenstack/components/RecaptchaTerms";
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
} from "./continuation";

function LoginForm(
  props: {
    challengeKey?: string;
    email?: string;
    method?: LoginMethod;
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
        key={[props.challengeKey, props.method, emailParam].join(":")}
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
  token: searchToken,
}: {
  challengeKey?: string;
  email: string;
  loginMessage: string | null;
  method?: LoginMethod;
  notice: string | null;
  token: string | null;
} & Continuation) {
  // A null key shows the code page while the send request is still pending.
  const [challengeKey, setChallengeKey] = useState<string | null | undefined>(
    initialChallengeKey,
  );
  const requestIdRef = useRef(0);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>(
    initialMethod ?? "email",
  );
  const [emailAddress, setEmailAddress] = useState(email);
  // An embedded form takes focus only once the visitor acts inside it.
  const [focusField, setFocusField] = useState<
    "email" | "password" | undefined
  >(mode === "embedded" ? undefined : "email");
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
    mode === "embedded" ? { anchor, mode, onComplete } : {};
  const completeLogin = useCompleteLogin(continuation);

  // The code page shows while the email is sent; a code cannot arrive before
  // the send completes, so nothing is lost. A failed send returns to where the
  // request began with the error. A result that a newer request has
  // superseded is dropped, so a stale send cannot pull the user back to the
  // code page.
  async function sendEmailCode(
    emailAddress: string,
    resendChallengeKey?: string,
  ) {
    const requestId = ++requestIdRef.current;
    const failureMessage = "We couldn’t send the email. Try again in a moment.";
    setEmailAddress(emailAddress);
    setChallengeKey(null);
    setStatusMessage(undefined);

    function showSendFailure(message: string) {
      setChallengeKey(resendChallengeKey);
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
      });

      if (requestIdRef.current !== requestId) {
        return;
      }
      if (result.status === "error") {
        showSendFailure(result.message ?? failureMessage);
        return;
      }
      if ("path" in result) {
        completeLogin(result.path, result.authState);
        return;
      }

      setChallengeKey(result.challengeKey);
      setUserInfo(result.authState);
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
        />
      </QueryProvider>
    );
  }

  function showLoginForm(method: LoginMethod, form: HTMLFormElement | null) {
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
          statusMessage={statusMessage}
          onResend={(activeChallengeKey) =>
            sendEmailCode(emailAddress, activeChallengeKey)
          }
          onShowEmailLogin={() => {
            requestIdRef.current += 1;
            setChallengeKey(undefined);
            setStatusMessage(undefined);
          }}
        />
      ) : loginMethod === "password" ? (
        <PasswordLoginForm
          autoFocus={focusField}
          continuation={continuation}
          emailDefaultValue={emailAddress}
          statusMessage={statusMessage}
          onShowEmailLogin={(form) => showLoginForm("email", form)}
        />
      ) : (
        <EmailLoginForm
          autoFocus={focusField === "email"}
          continuation={continuation}
          emailDefaultValue={emailAddress}
          statusMessage={statusMessage}
          onEmailLogin={sendEmailCode}
          onShowPasswordLogin={(form) => showLoginForm("password", form)}
        />
      )}

      <RecaptchaTerms />
    </div>
  );
}

function LoginLinkContent({
  continuation,
  token,
  onShowEmailLogin,
}: {
  continuation: Continuation;
  token: string;
  onShowEmailLogin: (message?: string) => void;
}) {
  const completeLogin = useCompleteLogin(continuation);
  const failure = useEmailLoginLink(token, {
    onFailure: ({ code, message }) => {
      if (code) {
        onShowEmailLogin(message);
      }
    },
    onSuccess: ({ authState, path }) => completeLogin(path, authState),
    returnTo: resolveReturnTo(continuation),
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
    returnTo: string;
  },
) {
  const verification = useMutation({
    mutationFn: (activeToken: string) =>
      fetcher<EmailLoginVerificationResult>("/api/auth", {
        action: "verify-email-login-link",
        ...(returnTo ? { returnTo } : {}),
        token: activeToken,
      }),
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
