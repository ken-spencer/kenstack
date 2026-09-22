import "server-only";

import { ReturnedError } from "@kenstack/api";
import { hasRecentAuthentication } from "./index";
import { getReauthenticationPath } from "@kenstack/auth/returnTo";
import { getCurrentSession } from "@kenstack/auth/server/user";

export async function requireRecentAuthentication(
  request: Request,
  userId?: number,
) {
  const session = await getCurrentSession();
  if (session && userId !== undefined && session.userId !== userId) {
    throw new ReturnedError("Sign in to continue.", {
      status: 401,
    });
  }
  if (session && session.impersonatedBy !== null) {
    throw new ReturnedError(
      "Account security changes are unavailable while impersonating a user.",
      { status: 403 },
    );
  }
  // The browser leaves the sensitive flow at five minutes; allow in-flight writes to finish.
  if (!session || !hasRecentAuthentication(session, undefined, 60_000)) {
    const referer = request.headers.get("referer");
    const returnTo =
      referer && URL.canParse(referer) ? new URL(referer) : undefined;
    throw new ReturnedError(
      session ? "Sign in again to continue." : "Sign in to continue.",
      {
        code: "reauthentication-required",
        status: session ? 403 : 401,
        redirect: getReauthenticationPath(
          returnTo ? returnTo.pathname + returnTo.search : undefined,
        ),
      },
    );
  }
  return session;
}
