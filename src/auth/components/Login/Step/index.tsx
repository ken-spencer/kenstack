import { Suspense } from "react";

import { loadPublicAuthState } from "@kenstack/auth/server/state";
import type { Step } from "@kenstack/components/StepFlow";
import { loadLoginFormProps } from "../loadFormProps";

import StepLoginForm from "./Form";

export async function createLoginStep({
  always = false,
  title = "Sign in",
}: {
  // Requested for flows that always include sign-in.
  always?: boolean;
  title?: string;
} = {}): Promise<Step | null> {
  if (!always) {
    const authState = await loadPublicAuthState();
    if (authState.state === "authenticated" || authState.state === "proven") {
      return null;
    }
  }

  return {
    content: (
      <div className="mt-7 max-w-[560px]">
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
