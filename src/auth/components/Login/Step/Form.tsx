"use client";

import {
  useEffectEvent,
  useLayoutEffect,
  useState,
  type ComponentProps,
} from "react";
import { useSearchParams } from "next/navigation";
import { logoutUser, useUserInfo } from "@kenstack/auth/useUserInfo";

import Button from "@kenstack/components/Button";
import Notice from "@kenstack/components/Notice";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import { useFlowContext, useStep } from "@kenstack/components/StepFlow/context";

import LoginForm from "../Form";
import { markLinkHandled, useHandledLinkToken } from "./linkVerification";

export default function StepLoginForm({
  challengeKey,
  email,
  isServerSignedIn = false,
  method,
  passwordPath,
}: Pick<
  ComponentProps<typeof LoginForm>,
  "challengeKey" | "email" | "method" | "passwordPath"
> & {
  // Whether the latest server render saw a signed-in visitor. Reaching the step signed in moves on
  // only when the server agrees, so a browser that still shows a session the server has ended stays.
  isServerSignedIn?: boolean;
}) {
  const { id, isActive, next } = useStep();
  const { activeStep, stepIds } = useFlowContext();
  const userInfo = useUserInfo();
  // A visit that arrived with an emailed link's token shows the form even
  // when signed in, so the link can sign in another account. The form
  // removes the token from the URL, so only its presence on arrival counts;
  // completing the step reports it handled, which also releases the step.
  const [linkToken] = useState(useSearchParams().get("token"));
  const handledToken = useHandledLinkToken();
  const hadLinkToken = linkToken !== null && handledToken !== linkToken;
  // A redeemed email challenge must not survive into the next login.
  const [redeemedChallengeKey, setRedeemedChallengeKey] = useState<string>();
  // The form waits for the sign-out to finish, so a late response cannot
  // undo a sign-in made in the meantime.
  const [accountSwitch, setAccountSwitch] = useState<{
    error: string | null;
    isPending: boolean;
  }>({ error: null, isPending: false });

  const signedInAs =
    userInfo.state === "authenticated"
      ? userInfo.name
      : userInfo.state === "proven"
        ? userInfo.email
        : null;
  const isSignedIn = signedInAs !== null;
  // A failed account switch restores the identity it cleared; that is no sign-in, and its error stays
  // until the visitor is next seen signed out.
  if (accountSwitch.error !== null && !accountSwitch.isPending && !isSignedIn) {
    setAccountSwitch({ error: null, isPending: false });
  }
  // A sign-in moves the flow on, whether this form finished it or another tab did, such as through
  // the emailed link, and so does reaching the step already signed in the first time it shows. The
  // signed-in view is for a visitor who comes back to the step, such as with Back.
  const canAdvance =
    !hadLinkToken &&
    !accountSwitch.isPending &&
    accountSwitch.error === null &&
    activeStep !== undefined &&
    stepIds.indexOf(activeStep) < stepIds.length - 1;
  const [arrival, setArrival] = useState({
    hasBeenActive: isActive,
    isActive,
    isAdvancing: isActive && isSignedIn && isServerSignedIn && canAdvance,
    isSignedIn,
  });
  if (arrival.isActive !== isActive || arrival.isSignedIn !== isSignedIn) {
    setArrival({
      hasBeenActive: arrival.hasBeenActive || isActive,
      isActive,
      isAdvancing:
        isActive &&
        isSignedIn &&
        canAdvance &&
        (!arrival.isSignedIn || (!arrival.hasBeenActive && isServerSignedIn)),
      isSignedIn,
    });
  }
  // Before paint, so the placeholder and the steps it passes never show.
  const advance = useEffectEvent(() => next());
  useLayoutEffect(() => {
    if (arrival.isAdvancing) {
      advance();
    }
  }, [arrival.isAdvancing]);

  if (arrival.isAdvancing) {
    return <div aria-busy="true" className="min-h-72" />;
  }

  if (!hadLinkToken && (accountSwitch.isPending || signedInAs !== null)) {
    return (
      <>
        {accountSwitch.isPending ? (
          <p aria-live="polite">Signing out…</p>
        ) : (
          <p>
            Signed in as <strong>{signedInAs}</strong>.
          </p>
        )}
        {accountSwitch.error ? (
          <Notice className="mt-4" message={accountSwitch.error} role="alert" />
        ) : null}
        <StepActions
          next={{ disabled: accountSwitch.isPending, label: "Continue" }}
        >
          <Button
            isPending={accountSwitch.isPending}
            onClick={async () => {
              setAccountSwitch({ error: null, isPending: true });
              try {
                await logoutUser();
                setAccountSwitch({ error: null, isPending: false });
              } catch (error) {
                setAccountSwitch({
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unable to sign out.",
                  isPending: false,
                });
              }
            }}
            type="button"
            variant="secondary"
          >
            Use a different account
          </Button>
        </StepActions>
      </>
    );
  }

  return (
    <LoginForm
      anchor={id}
      challengeKey={
        redeemedChallengeKey === challengeKey ? undefined : challengeKey
      }
      email={email}
      method={method}
      mode="embedded"
      passwordPath={passwordPath}
      onComplete={() => {
        setRedeemedChallengeKey(challengeKey);
        if (linkToken !== null) {
          markLinkHandled(linkToken);
        }
        next();
      }}
    />
  );
}
