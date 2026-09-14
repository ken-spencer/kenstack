import { Suspense } from "react";

import { loadPublicAuthState } from "@kenstack/auth/server/state";
import type { Step } from "@kenstack/components/StepFlow";
import { loadLoginFormProps } from "../loadFormProps";

import StepLoginForm from "./Form";
import LoginController from "./Controller";

// Composed for every visit. A visit that starts signed in skips the step and
// its controller brings it back only if identity is lost; a visit that starts
// signed out keeps it as an ordinary step. Signing in updates browser
// identity in place; nothing here refreshes the server.
export async function createLoginStep({
  title = "Sign in",
}: {
  title?: string;
} = {}): Promise<Step> {
  const authState = await loadPublicAuthState();

  return {
    controller: <LoginController authState={authState} />,
    content: (
      <div className="mt-7 max-w-[560px]">
        <Suspense fallback={<div className="min-h-72 animate-pulse" />}>
          <RememberedStepLoginForm />
        </Suspense>
      </div>
    ),
    // A signed-in visit starts skipped; a signed-out visit gets an ordinary
    // step, not a live prerequisite, so signing in and continuing completes it.
    skipped:
      authState.state === "authenticated" || authState.state === "proven"
        ? true
        : undefined,
    title,
  };
}

async function RememberedStepLoginForm() {
  const formProps = await loadLoginFormProps();

  return <StepLoginForm {...formProps} />;
}
