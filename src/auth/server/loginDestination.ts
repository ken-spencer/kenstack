import { getSafeReturnToPath } from "@kenstack/auth/returnTo";

import { getCurrentUser } from "./user";
import { getUsersModule } from "./getUsersModule";

// A safe returnTo always wins; otherwise the users module's loginDestination chooses, and its answer
// passes the same check. The current user is keyed by session token, so a session that sign-in has
// just created reads fresh.
export async function resolveLoginDestination(
  returnTo: string | null | undefined,
) {
  const safeReturnTo = getSafeReturnToPath(returnTo);
  if (safeReturnTo) {
    return safeReturnTo;
  }

  const user = await getCurrentUser();
  if (!user) {
    return "/";
  }

  return (
    getSafeReturnToPath(await getUsersModule().loginDestination(user)) ?? "/"
  );
}
