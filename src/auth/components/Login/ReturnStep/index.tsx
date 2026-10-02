import { loadPublicAuthState } from "@kenstack/auth/server/state";
import { resolveLoginDestination } from "@kenstack/auth/server/loginDestination";
import type { Step } from "@kenstack/components/StepFlow";

import LoginReturn, { LoginReturnController } from "./LoginReturn";

// The standalone login flow's last step: once signed in, the visitor leaves for a safe returnTo, or
// for where the users module's loginDestination sends the account. A signed-in arrival leaves for
// the destination resolved here.
export async function createLoginReturnStep(): Promise<Step> {
  const authState = await loadPublicAuthState();

  return {
    content: <LoginReturn />,
    controller: (
      <LoginReturnController
        destination={
          authState.state === "authenticated"
            ? {
                path: await resolveLoginDestination(undefined),
                userId: authState.userId,
              }
            : undefined
        }
      />
    ),
    final: true,
    title: "Signed in",
  };
}
