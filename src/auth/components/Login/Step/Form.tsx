"use client";

import { useState, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";

import { useStep } from "@kenstack/components/StepFlow/context";

import LoginForm from "../Form";

export default function StepLoginForm({
  challengeKey,
  email,
  method,
  passwordPath,
}: Pick<
  ComponentProps<typeof LoginForm>,
  "challengeKey" | "email" | "method" | "passwordPath"
>) {
  const { id, isActive, next } = useStep();
  // An emailed link's token stays in the address while the step's controller verifies it; the form
  // mounts once it has settled, since it would consume the token.
  const isSigningIn = useSearchParams().has("token");
  // A redeemed email challenge must not survive into the next login.
  const [redeemedChallengeKey, setRedeemedChallengeKey] = useState<string>();
  // A completed sign-in stays on screen as it was while the flow moves on or
  // the page leaves; the step stays active until its controller skips it.
  // Brought back after that, when identity is lost, the form remounts without
  // the redeemed challenge, so it starts afresh.
  const [signIns, setSignIns] = useState(0);
  const [completed, setCompleted] = useState<{
    challengeKey?: string;
    hasLeft: boolean;
  }>();
  if (completed && !completed.hasLeft && !isActive) {
    setCompleted({ ...completed, hasLeft: true });
  } else if (completed?.hasLeft && isActive) {
    setCompleted(undefined);
    setRedeemedChallengeKey(completed.challengeKey);
    setSignIns((count) => count + 1);
  }

  if (isSigningIn) {
    return (
      <p aria-live="polite" className="text-sm">
        Signing you in…
      </p>
    );
  }

  return (
    <LoginForm
      anchor={id}
      key={signIns}
      challengeKey={
        redeemedChallengeKey === challengeKey ? undefined : challengeKey
      }
      email={email}
      method={method}
      mode="embedded"
      passwordPath={passwordPath}
      onComplete={() => {
        setCompleted({ challengeKey, hasLeft: false });
        next();
      }}
    />
  );
}
