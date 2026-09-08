import { Suspense } from "react";

import { loadPublicAuthState } from "@kenstack/auth/server/state";
import type { Step } from "@kenstack/components/StepFlow";
import { loadLoginFormProps } from "../loadFormProps";

import StepLoginForm from "./Form";
import LoginController from "./Controller";

export async function createLoginStep({
  always = false,
  index,
  title = "Sign in",
}: {
  // Requested for flows that always include sign-in.
  always?: boolean;
  index?: Step["index"];
  title?: string;
} = {}): Promise<Step> {
  const authState = always ? undefined : await loadPublicAuthState();
  const skipped = authState
    ? authState.state === "authenticated" || authState.state === "proven"
    : undefined;

  return {
    index,
    controller: authState ? (
      <LoginController authState={authState} />
    ) : undefined,
    skipped,
    // A redeemed email challenge must not survive into the next login.
    content: (
      <div
        className="mt-7 max-w-[560px]"
        key={skipped ? "identified" : "signin"}
      >
        <Suspense fallback={<div className="min-h-72 animate-pulse" />}>
          <RememberedStepLoginForm />
        </Suspense>
      </div>
    ),
    title,
  };
}

async function RememberedStepLoginForm() {
  const formProps = await loadLoginFormProps();

  return <StepLoginForm {...formProps} />;
}
