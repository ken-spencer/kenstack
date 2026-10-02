import "server-only";

import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { modules } from "@app/modules";
import type { DbTransaction } from "@kenstack/db/types";
import { sessions } from "@kenstack/db/tables/sessions";
import { hashToken } from "@kenstack/auth/server/token";
import { getCurrentSession, sessionCacheTag } from "@kenstack/auth/server/user";
import { ReturnedError } from "@kenstack/api";
import { hasRecentAuthentication } from "./index";
import { getLoginReturnPath } from "@kenstack/auth/returnTo";

// The guard is the only authority for a protected write, and refuses before the handler writes: signed
// out, sign in; a stale session, "reauthentication-required", with no redirect, so the page keeps what
// was typed and asks for confirmation. The pipeline's access check already refused a page rendered for
// another account.
export async function requireRecentAuthentication(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    const referer = request.headers.get("referer");
    const returnTo =
      referer && URL.canParse(referer) ? new URL(referer) : undefined;
    throw new ReturnedError("Sign in to continue.", {
      code: "reauthentication-required",
      status: 401,
      redirect: getLoginReturnPath(
        returnTo ? returnTo.pathname + returnTo.search : undefined,
      ),
    });
  }
  if (session.impersonatedBy !== null) {
    throw new ReturnedError(
      "Account security changes are unavailable while impersonating a user.",
      { status: 403 },
    );
  }
  if (!hasRecentAuthentication(session)) {
    throw new ReturnedError(
      "Nothing was changed. Submit again to confirm your identity.",
      {
        code: "reauthentication-required",
        status: 403,
      },
    );
  }
  return session;
}

// Issuing an email-change code extends only authority that is still live, through the code's expiry.
// The database clock and guarded update also cover time spent waiting for a lock.
export async function extendAuthorization(
  { sessionId }: { sessionId: number },
  tx: DbTransaction,
  expiresAt: Date,
) {
  const token = (await cookies()).get("sessionId")?.value;
  if (!token) {
    throw new ReturnedError("Sign in to continue.", { status: 401 });
  }
  const tokenHash = hashToken(token);
  const users = modules.users.admin.table;
  // UPDATE can evaluate its predicate before waiting on an unchanged row
  // lock. Acquire that lock first, then test liveness with the database clock.
  await tx
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.tokenHash, tokenHash)))
    .for("update");
  const [session] = await tx
    .update(sessions)
    .set({
      authorizedUntil: sql`least(${sessions.expiresAt}, greatest(${sessions.authorizedUntil}, ${expiresAt.toISOString()}::timestamptz))`,
    })
    .from(users)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.tokenHash, tokenHash),
        eq(users.id, sessions.userId),
        isNull(users.deletedAt),
        isNull(sessions.impersonatedBy),
        gt(sessions.expiresAt, sql`clock_timestamp()`),
        sql`${sessions.authorizedUntil} > clock_timestamp()`,
      ),
    )
    .returning({ authorizedUntil: sessions.authorizedUntil });
  if (!session) {
    throw new ReturnedError(
      "Nothing was changed. Submit again to confirm your identity.",
      {
        code: "reauthentication-required",
        status: 403,
      },
    );
  }
  // The cached session carries the deadline. Queued tags reach the cache after
  // the handler returns, so a caller's transaction has committed by then.
  revalidateTag(sessionCacheTag(tokenHash), { expire: 0 });
  return session.authorizedUntil;
}
