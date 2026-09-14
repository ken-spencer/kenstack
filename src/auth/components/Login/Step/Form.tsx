"use client";

import { useState, type ComponentProps } from "react";
import { useUserInfo } from "@kenstack/auth/useUserInfo";

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
  const { entryPath, id, next } = useStep();
  const userInfo = useUserInfo();
  const [completed, setCompleted] = useState<{ challengeKey?: string }>();
  const hasCompleted = completed && completed.challengeKey === challengeKey;

  if (
    hasCompleted &&
    (userInfo.state === "authenticated" || userInfo.state === "proven")
  ) {
    return <p aria-live="polite">Signing you in…</p>;
  }

  return (
    <LoginForm
      anchor={id}
      challengeKey={hasCompleted ? undefined : challengeKey}
      email={email}
      entryPath={entryPath}
      method={method}
      mode="embedded"
      onComplete={() => {
        setCompleted({ challengeKey });
        next();
      }}
    />
  );
}
