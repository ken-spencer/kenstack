"use client";

import { useState, type ComponentProps } from "react";
import { logoutUser, useUserInfo } from "@kenstack/auth/useUserInfo";

import Button from "@kenstack/components/Button";
import Notice from "@kenstack/components/Notice";
import { StepActions } from "@kenstack/components/StepFlow/StepActions";
import { useStep } from "@kenstack/components/StepFlow/context";

import LoginForm from "../Form";

export default function StepLoginForm({
  challengeKey,
  email,
  method,
}: Pick<
  ComponentProps<typeof LoginForm>,
  "challengeKey" | "email" | "method"
>) {
  const { id, next } = useStep();
  const userInfo = useUserInfo();
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

  if (accountSwitch.isPending || signedInAs !== null) {
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
      onComplete={() => {
        setRedeemedChallengeKey(challengeKey);
        next();
      }}
    />
  );
}
