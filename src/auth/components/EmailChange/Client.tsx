"use client";

// The client part of EmailChange. It owns its two link parameters: a cancellation works without a
// session and stays untracked; a confirmation verifies when signed in, and signed out sends the visitor
// to sign in with a return here that carries the token it kept.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import fetcher from "@kenstack/api/fetcher";
import type {
  EmailChangeCancelResult,
  EmailChangeRequestResult,
  EmailChangeVerificationResult,
} from "@kenstack/auth/api";
import {
  emailChangeCodeSchema,
  emailChangeEmailSchema,
} from "@kenstack/auth/email/change/schemas";
import { verificationEndedCode } from "@kenstack/auth/email/verification/internal/policy";
import { getLoginReturnPath } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";
import { postReauthentication } from "@kenstack/auth/reauthentication/channel";
import { useAuthorization } from "@kenstack/auth/reauthentication/context";
import useParamAction from "@kenstack/hooks/useParamAction";
import { setUserInfo, useUserInfo } from "@kenstack/auth/useUserInfo";
import type { StatusMessage } from "@kenstack/forms/context";

import LinkButton from "@kenstack/auth/components/Login/Form/LinkButton";
import VerificationCodeField from "@kenstack/auth/components/VerificationCodeField";
import Notice from "@kenstack/components/Notice";
import Form from "@kenstack/forms/Form";
import InputField from "@kenstack/forms/InputField";
import Submit from "@kenstack/forms/Submit";
import useConsumedSearchParam from "@kenstack/hooks/useConsumedSearchParam";

const cancelOutcomeMessages = {
  cancelled: {
    message: "The email change was cancelled.",
    status: "information",
  },
  completed: {
    message:
      "That change has already been completed. If this wasn’t you, reset your password and contact us.",
    status: "error",
  },
  unknown: {
    message: "That request has already ended.",
    status: "information",
  },
} satisfies Record<EmailChangeCancelResult["outcome"], StatusMessage>;

type View =
  | { kind: "email" }
  // A null challengeKey means a resend is in flight: a code entered now would
  // verify against a challenge the server has already replaced.
  | {
      challengeKey: string | null;
      email: string;
      kind: "code";
      statusMessage?: StatusMessage;
    };

const apiPath = "/api/auth";

export default function EmailChangeClient() {
  const token = useConsumedSearchParam("confirmEmailChange");
  const cancelChallengeKey = useConsumedSearchParam("cancelEmailChange");

  return (
    <EmailChangeContent cancelChallengeKey={cancelChallengeKey} token={token} />
  );
}

function EmailChangeContent({
  cancelChallengeKey,
  token: searchToken,
}: {
  cancelChallengeKey: string | null;
  token: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { track, userId } = useAuthorization();
  const userInfo = useUserInfo();
  const [view, setView] = useState<View>({ kind: "email" });
  // Outcomes independent of the form being shown: a confirmed change, a
  // failed link, a cancellation.
  const [notice, setNotice] = useState<StatusMessage>();
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const token = searchToken === dismissedToken ? null : searchToken;
  const requestIdRef = useRef(0);
  const isSignedIn = userInfo.state === "authenticated";
  // Rendered signed out, this part has no wrapper and so no account to name; a sign-in elsewhere
  // renders the page again for the wrapper before anything is changed.
  const canChange = isSignedIn && userId !== undefined;
  useEffect(() => {
    if (isSignedIn && userId === undefined) {
      // The wrapper remounts this part, so a pending confirmation goes back into the address, with
      // a full load: the router could reuse the page it rendered signed out.
      if (token) {
        window.location.replace(
          `${pathname}?${new URLSearchParams({ confirmEmailChange: token })}`,
        );
      } else {
        router.refresh();
      }
    }
  }, [isSignedIn, pathname, router, token, userId]);

  // Email-change links are bound to the account, not the browser, so the link works after signing in
  // on any device; the parameter has already left the address bar, so the return carries it.
  useEffect(() => {
    if (token && userInfo.state !== "loading" && !isSignedIn) {
      router.push(
        getLoginReturnPath(
          `${pathname}?${new URLSearchParams({ confirmEmailChange: token })}`,
        ),
      );
    }
  }, [isSignedIn, pathname, router, token, userInfo.state]);

  // The code form adopts the response's user info itself; the link's callback adopts it before calling this.
  function complete(authState: PublicAuthState) {
    router.refresh();
    if (authState.state === "authenticated") {
      postReauthentication({ type: "saved", userId: authState.userId });
    }
    setView({ kind: "email" });
    setNotice({
      message:
        authState.state === "authenticated" ? (
          <>
            Your sign-in email is now <strong>{authState.email}</strong>.
          </>
        ) : (
          "Your sign-in email has been updated."
        ),
      status: "success",
    });
  }

  const isConfirmingLink = useParamAction(
    canChange ? token : null,
    (activeToken) =>
      track(() =>
        fetcher<EmailChangeVerificationResult>(apiPath, {
          action: "verify-email-change-link",
          token: activeToken,
        }),
      ),
    (activeToken, result) => {
      setDismissedToken(activeToken);
      if (result?.status === "success") {
        setUserInfo(result.userInfo.authState);
        complete(result.userInfo.authState);
        return;
      }
      setNotice({
        message:
          result?.code === "reauthentication-required"
            ? "Your email wasn’t changed. Open the link in the email again to confirm it."
            : (result?.message ??
              "We couldn’t confirm your new email. Try the link again."),
        status: "error",
      });
    },
  );

  useParamAction(
    cancelChallengeKey,
    (challengeKey) =>
      fetcher<EmailChangeCancelResult>(apiPath, {
        action: "cancel-email-change",
        challengeKey,
      }),
    (_challengeKey, result) => {
      setNotice(
        result?.status === "success"
          ? cancelOutcomeMessages[result.outcome]
          : {
              message:
                result?.message ??
                "We couldn’t cancel the change. Try the link again.",
              status: "error",
            },
      );
    },
  );

  // A request the server no longer knows cannot be completed from the code
  // screen, so the visitor is returned to where a new one starts.
  function returnToEmailForm(message: string) {
    requestIdRef.current += 1;
    setView({ kind: "email" });
    setNotice({ message, status: "error" });
  }

  // A stale result must not pull the user back to the code page after they
  // moved on.
  async function resend(email: string, challengeKey: string) {
    const requestId = ++requestIdRef.current;
    const failureMessage = "We couldn’t send the email. Try again in a moment.";
    setView({ challengeKey: null, email, kind: "code" });

    let next: View;
    try {
      const result = await track(() =>
        fetcher<EmailChangeRequestResult>(apiPath, {
          action: "email-change",
          challengeKey,
          email,
        }),
      );
      if (result.status === "error" && result.code === verificationEndedCode) {
        if (requestIdRef.current === requestId) {
          returnToEmailForm(result.message ?? failureMessage);
        }
        return;
      }
      next =
        result.status === "success"
          ? {
              challengeKey: result.challengeKey,
              email: result.email,
              kind: "code",
            }
          : {
              challengeKey,
              email,
              kind: "code",
              statusMessage: {
                message: result.message ?? failureMessage,
                status: "error",
              },
            };
    } catch {
      next = {
        challengeKey,
        email,
        kind: "code",
        statusMessage: { message: failureMessage, status: "error" },
      };
    }
    if (requestIdRef.current === requestId) {
      setView(next);
    }
  }

  return (
    <div className="w-full space-y-4">
      {notice ? (
        <Notice message={notice.message} status={notice.status} />
      ) : null}
      {isConfirmingLink ? (
        <p aria-live="polite" className="text-sm">
          Confirming your new email…
        </p>
      ) : !canChange ? (
        !isSignedIn && userInfo.state !== "loading" && !token ? (
          <p>
            <Link
              className="underline underline-offset-4"
              href={getLoginReturnPath(pathname)}
            >
              Sign in to change your sign-in email
            </Link>
          </p>
        ) : null
      ) : view.kind === "email" ? (
        // The field starts as the current address, so changing it is one
        // edit and one click; a completed change reseeds it through the key.
        <Form<
          EmailChangeRequestResult,
          Record<string, unknown>,
          typeof emailChangeEmailSchema
        >
          apiPath={apiPath}
          className="w-full space-y-4"
          defaultValues={{ email: userInfo.email }}
          key={userInfo.email}
          schema={emailChangeEmailSchema}
          onSubmit={({ data, mutation }) => {
            setNotice(undefined);
            mutation.mutate({ action: "email-change", email: data.email });
          }}
          onSuccess={(result) =>
            setView({
              challengeKey: result.challengeKey,
              email: result.email,
              kind: "code",
            })
          }
        >
          <InputField
            autoComplete="email"
            label={<span className="sr-only">Email</span>}
            name="email"
            type="email"
          />
          <Submit disabledUntilDirty>Change email</Submit>
        </Form>
      ) : (
        <EmailChangeCodeForm
          challengeKey={view.challengeKey}
          email={view.email}
          statusMessage={view.statusMessage}
          onComplete={complete}
          onEnded={returnToEmailForm}
          onResend={(challengeKey) => resend(view.email, challengeKey)}
          onShowEmailForm={() => {
            requestIdRef.current += 1;
            setView({ kind: "email" });
          }}
        />
      )}
    </div>
  );
}

function EmailChangeCodeForm({
  challengeKey,
  email,
  onComplete,
  onEnded,
  onResend,
  onShowEmailForm,
  statusMessage,
}: {
  challengeKey: string | null;
  email: string;
  onComplete: (authState: PublicAuthState) => void;
  onEnded: (message: string) => void;
  onResend: (challengeKey: string) => void;
  onShowEmailForm: () => void;
  statusMessage?: StatusMessage;
}) {
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
            Enter the six-digit code we sent to <strong>{email}</strong>. You
            can also open the link in the email. It may take a minute to arrive
            — check your spam or junk folder if you don’t see it.
          </>
        )}
      </p>
      <Form<
        EmailChangeVerificationResult,
        Record<string, unknown>,
        typeof emailChangeCodeSchema
      >
        apiPath={apiPath}
        className="w-full space-y-4"
        defaultValues={{ code: "" }}
        initialStatusMessage={statusMessage}
        key={challengeKey ?? "sending"}
        schema={emailChangeCodeSchema}
        onSubmit={({ data, mutation }) => {
          if (challengeKey === null) {
            return;
          }

          mutation.mutate(
            {
              action: "verify-email-change-code",
              challengeKey,
              code: data.code,
            },
            {
              onSuccess: (result) => {
                if (
                  result.status === "error" &&
                  result.code === verificationEndedCode
                ) {
                  onEnded(
                    result.message ??
                      "That request has ended. Enter the email again to start over.",
                  );
                }
              },
            },
          );
        }}
        onSuccess={(result) => onComplete(result.userInfo.authState)}
      >
        <VerificationCodeField disabled={isSending} name="code" />
        <div className="flex flex-wrap items-center gap-4">
          <Submit className="order-last ml-auto" disabled={isSending}>
            Continue
          </Submit>
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
          <LinkButton onClick={onShowEmailForm}>
            Use a different email
          </LinkButton>
        </div>
      </Form>
    </div>
  );
}
