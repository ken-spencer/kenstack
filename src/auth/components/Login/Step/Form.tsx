"use client";

import type { ComponentProps } from "react";

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

  return (
    <LoginForm
      anchor={id}
      challengeKey={challengeKey}
      email={email}
      method={method}
      mode="embedded"
      onComplete={next}
    />
  );
}
