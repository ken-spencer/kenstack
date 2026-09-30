"use client";

import { useState, type ComponentProps } from "react";
import { useSearchParams } from "next/navigation";

import { useStep } from "@kenstack/components/StepFlow/context";

import LoginForm from "../Form";
import { markLinkHandled } from "./linkVerification";

export default function StepLoginForm({
  challengeKey,
  email,
  method,
  passwordPath,
}: Pick<
  ComponentProps<typeof LoginForm>,
  "challengeKey" | "email" | "method" | "passwordPath"
>) {
  const { id, next } = useStep();
  // A visit that arrived with an emailed link's token shows the form even
  // when signed in, so the link can sign in another account. The form
  // removes the token from the URL, so only its presence on arrival counts;
  // completing the step reports it handled, which also releases the step.
  const [linkToken] = useState(useSearchParams().get("token"));
  // A redeemed email challenge must not survive into the next login.
  const [redeemedChallengeKey, setRedeemedChallengeKey] = useState<string>();
  // Each completed sign-in remounts the form, so a step brought back when
  // identity is lost starts afresh, not from the finished form.
  const [signIns, setSignIns] = useState(0);

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
        setRedeemedChallengeKey(challengeKey);
        setSignIns((count) => count + 1);
        if (linkToken !== null) {
          markLinkHandled(linkToken);
        }
        next();
      }}
    />
  );
}
