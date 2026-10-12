"use client";

import { useState, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";

import { useStep } from "@kenstack/components/StepFlow/context";
import useIsHydrated from "@kenstack/hooks/useIsHydrated";

import LoginForm from "../Form";
import { useLinkStore } from "./linkStore";

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
  // The step's controller verifies an emailed link once hydrated; until then, an arrival address with
  // a token shows the same placeholder, so the form never flashes first.
  const isVerifyingLink = useLinkStore((state) => state.isVerifying);
  const isHydrated = useIsHydrated();
  const hasArrivalToken = useSearchParams().has("token");
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

  if (isVerifyingLink || (!isHydrated && hasArrivalToken)) {
    return (
      <div aria-busy="true" className="min-h-72 animate-pulse" role="status">
        <p className="sr-only">Signing you in</p>
      </div>
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
