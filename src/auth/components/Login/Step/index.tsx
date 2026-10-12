import { Suspense } from "react";

import { loadPublicAuthState } from "@kenstack/auth/server/state";
import type { Step } from "@kenstack/components/StepFlow";
import { loadLoginFormProps } from "../loadFormProps";

import StepLoginForm from "./Form";
import LoginController from "./Controller";

// Composed for every visit. A signed-in visitor skips the step, forward and
// Back: it starts skipped and satisfied on the server, and its controller
// follows browser identity, bringing it forward, unsatisfied, if identity is
// lost and skipping it again once the visitor signs in. A step that isn't
// skippable, such as the login page's, always shows and moves on only for a
// sign-in made on it, so a signed-in visitor can sign in again. Signing in
// updates browser identity in place, and the controller refreshes the server
// render. The controller also verifies an emailed link that lands on the flow.
export async function createLoginStep({
  title = "Your email",
  skippable = true,
}: {
  title?: string;
  skippable?: boolean;
} = {}): Promise<Step> {
  const authState = await loadPublicAuthState();
  const hasIdentity =
    authState.state === "authenticated" || authState.state === "proven";

  return {
    controller: <LoginController authState={authState} skippable={skippable} />,
    content: (
      <div className="mt-7 max-w-[560px]">
        <Suspense fallback={<div className="min-h-72 animate-pulse" />}>
          <RememberedStepLoginForm />
        </Suspense>
      </div>
    ),
    skipped: skippable && hasIdentity,
    satisfied: hasIdentity,
    title,
  };
}

async function RememberedStepLoginForm() {
  const formProps = await loadLoginFormProps();

  return <StepLoginForm {...formProps} />;
}
