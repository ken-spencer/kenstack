import "server-only";

import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@app/db";
import { modules } from "@app/modules";
import type { DbTransaction } from "@kenstack/db/types";
import { sessions } from "@kenstack/db/tables/sessions";
import { hashToken } from "@kenstack/auth/server/token";
import {
  getFreshCurrentSession,
  sessionCacheTag,
} from "@kenstack/auth/server/user";
import { ReturnedError } from "@kenstack/api";
import { authenticationWindowMs, hasRecentAuthentication } from "./index";
import {
  getReauthenticationPath,
  getSafeReturnToPath,
} from "@kenstack/auth/returnTo";

export async function requireRecentAuthentication(
  request: Request,
  userId?: number,
) {
  const session = await getFreshCurrentSession();
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
  // Submission grace lets in-flight writes finish; it never permits extension.
  if (!session || !hasRecentAuthentication(session, 60_000)) {
    const referer = request.headers.get("referer");
    const returnTo =
      referer && URL.canParse(referer) ? new URL(referer) : undefined;
    const path = getSafeReturnToPath(
      returnTo ? returnTo.pathname + returnTo.search : undefined,
    );
    throw new ReturnedError(
      session
        ? "Please confirm your identity to continue."
        : "Sign in to continue.",
      {
        code: "reauthentication-required",
        status: session ? 403 : 401,
        // A stale signed-in form reloads its inline identity check.
        redirect: session && path ? path : getReauthenticationPath(path),
      },
    );
  }
  return session;
}

// Both activity and challenge issuance extend only authority that is still live.
// The database clock and guarded update also cover time spent waiting for a lock.
export async function extendAuthorization(
  { sessionId }: { sessionId: number },
  tx?: DbTransaction,
  expiresAt?: Date,
) {
  const token = (await cookies()).get("sessionId")?.value;
  if (!token) {
    throw new ReturnedError("Sign in to continue.", {
      code: "reauthentication-required",
      status: 401,
    });
  }
  const tokenHash = hashToken(token);
  const users = modules.users.admin.table;
  const extend = async (connection: DbTransaction) => {
    // UPDATE can evaluate its predicate before waiting on an unchanged row
    // lock. Acquire that lock first, then test liveness with the database clock.
    await connection
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.tokenHash, tokenHash)))
      .for("update");
    const [session] = await connection
      .update(sessions)
      .set({
        authorizedUntil: sql`least(${sessions.expiresAt}, greatest(${sessions.authorizedUntil}, ${expiresAt ? sql`${expiresAt.toISOString()}::timestamptz` : sql`clock_timestamp() + ${authenticationWindowMs} * interval '1 millisecond'`}))`,
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
      .returning({
        id: sessions.id,
        userId: sessions.userId,
        authorizedUntil: sessions.authorizedUntil,
      });
    return session;
  };
  const session = tx ? await extend(tx) : await db.transaction(extend);
  if (!session) {
    throw new ReturnedError("Please confirm your identity to continue.", {
      code: "reauthentication-required",
      status: 403,
    });
  }
  // The cached session carries the deadline. Queued tags reach the cache after
  // the handler returns, so a caller's transaction has committed by then.
  revalidateTag(sessionCacheTag(tokenHash), { expire: 0 });
  return session;
}

export function serializeAuthorization(
  session: Pick<
    typeof sessions.$inferSelect,
    "id" | "userId" | "authorizedUntil"
  >,
) {
  return {
    sessionId: session.id,
    userId: session.userId,
    authorizedUntil: session.authorizedUntil.toISOString(),
    remainingMs: session.authorizedUntil.getTime() - Date.now(),
  };
}

export type Authorization = ReturnType<typeof serializeAuthorization>;
