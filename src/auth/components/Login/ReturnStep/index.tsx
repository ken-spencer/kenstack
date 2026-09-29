import type { Step } from "@kenstack/components/StepFlow";

import LoginReturn from "./LoginReturn";

// The standalone login flow's last step: once signed in, the visitor leaves for a safe returnTo, or
// for where the users module's loginDestination sends the account.
export function createLoginReturnStep(): Step {
  return { content: <LoginReturn />, final: true, title: "Signed in" };
}
