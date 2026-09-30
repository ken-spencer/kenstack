import { Suspense } from "react";

import { getUsersModule } from "@kenstack/auth/server/getUsersModule";
import { loadPublicAuthState } from "@kenstack/auth/server/state";
import type { Step } from "@kenstack/components/StepFlow";
import { loadLoginFormProps } from "../loadFormProps";

import StepLoginForm from "./Form";
import LoginController from "./Controller";

// Composed for every visit. A signed-in visitor skips the step, forward and
// Back: it starts skipped on the server, and its controller follows browser
// identity, bringing it forward if identity is lost and skipping it again once
// the visitor signs in. Signing in updates browser identity in place, and the
// controller refreshes the server render.
export async function createLoginStep({
  hasLinkToken = false,
  title = "Sign in",
}: {
  // The visit arrived with an emailed link's token. A signed-in visit then
  // keeps the step from the first render, since the link may sign in
  // another account; the controller does the same once in the browser, so
  // a flow that cannot pass this still verifies the link, one step later.
  hasLinkToken?: boolean;
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
    skipped:
      !hasLinkToken &&
      (authState.state === "authenticated" || authState.state === "proven")
        ? true
        : undefined,
    title,
  };
}

async function RememberedStepLoginForm() {
  const formProps = await loadLoginFormProps();

  return (
    <StepLoginForm
      {...formProps}
      passwordPath={getUsersModule().passwordPath}
    />
  );
}
