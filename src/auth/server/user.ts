import { cache } from "react";
import { cacheLife, cacheTag, io } from "next/cache";
import { cookies, headers } from "next/headers";
import { and, isNull, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import omit from "lodash-es/omit";

import { modules } from "@app/modules";
import roles from "@app/roles";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import { getLoginReturnPath } from "@kenstack/auth/returnTo";
import { selectMediaSubquery } from "@kenstack/db/queries/media";
import { query } from "@kenstack/db/queries/query";
import { sessions } from "@kenstack/db/tables/sessions";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";
import { adminLoadCacheTag } from "@kenstack/admin/cache";

import { hashToken } from "./token";
import { getUsersModule } from "./getUsersModule";
import type { Role } from "./types";

const maxSessionCacheSeconds = 15 * 60;

export function sessionCacheTag(tokenHash: string) {
  return `auth-session:${tokenHash}`;
}

export function userSessionsCacheTag(userId: number) {
  return `auth-user-sessions:${userId}`;
}

async function loadUserByTokenHash(tokenHash: string) {
  const users = modules.users.admin.table;
  const [user] = await query(sessions)
    .select(getUsersModule().currentUser.select)
    // Kenstack's own fields follow, so a site field with the same name cannot replace them.
    .select({
      id: users.id,
      impersonatedBy: sessions.impersonatedBy,
      givenName: users.givenName,
      middleName: users.middleName,
      familyName: users.familyName,
      email: users.email,
      avatar: selectMediaSubquery(users.avatar, "square"),
      roles: users.roles,
      sessionId: sessions.id,
      provider: sessions.provider,
      expiresAt: sessions.expiresAt,
      authorizedUntil: sessions.authorizedUntil,
    })
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, sql`now()`),
        isNull(users.deletedAt),
      ),
    )
    .build()
    .limit(1);

  return user;
}

// Cached per session for up to fifteen minutes; login, logout, impersonation,
// password changes, and user edits revalidate the tags so a change takes
// effect on the next request. getFreshCurrentUser and getFreshCurrentSession
// bypass it.
async function getCachedUserByTokenHash(tokenHash: string) {
  "use cache: remote";
  cacheTag(sessionCacheTag(tokenHash));

  const user = await loadUserByTokenHash(tokenHash);
  if (!user) {
    // A miss carries no user tag, so restoring a deleted account could not
    // revalidate it; keep misses too short to matter.
    cacheLife({ expire: 1 });
    return user;
  }

  const expiresInSeconds = Math.max(
    1,
    Math.floor((user.expiresAt.getTime() - Date.now()) / 1000),
  );
  const expire = Math.min(maxSessionCacheSeconds, expiresInSeconds);
  cacheLife({ revalidate: Math.max(0, expire - 1), expire });
  cacheTag(userSessionsCacheTag(user.id));
  cacheTag(adminLoadCacheTag("users", user.id));

  return user;
}

// Role filtering and display names are applied after the cache so a registry
// change applies to cached sessions immediately.
function toPublicUser(
  user: NonNullable<Awaited<ReturnType<typeof loadUserByTokenHash>>>,
) {
  return {
    // The site's selected fields travel with the user; the session columns stay behind.
    ...omit(user, [
      "authorizedUntil",
      "expiresAt",
      "impersonatedBy",
      "provider",
      "roles",
      "sessionId",
    ]),
    // Persisted values grant authority only while the host still registers
    // them, so removing a role disables it without rewriting stored rows.
    roles: user.roles.filter((role): role is Role =>
      Object.hasOwn(roles, role),
    ),
    ...(user.impersonatedBy ? { impersonatedBy: user.impersonatedBy } : {}),
    name: formatUserName(user),
    initials: formatUserInitials(user),
  };
}

async function loadFreshUserBySessionToken(token: string) {
  if (!token) {
    return;
  }
  const user = await loadUserByTokenHash(hashToken(token));
  return user && toPublicUser(user);
}

const getUserBySessionToken = cache(async (token: string) => {
  if (!token) {
    return;
  }
  const user = await getCachedUserByTokenHash(hashToken(token));
  return user && toPublicUser(user);
});

async function getSessionToken() {
  return (await cookies()).get("sessionId")?.value ?? "";
}

export const getCurrentUser = async () =>
  getUserBySessionToken(await getSessionToken());

export const getFreshCurrentUser = async () =>
  loadFreshUserBySessionToken(await getSessionToken());

async function toSession(
  user: Awaited<ReturnType<typeof loadUserByTokenHash>>,
) {
  // The expiry check reads the clock, so it must not run while prerendering.
  await io();
  if (!user || user.expiresAt <= new Date()) {
    return;
  }

  return {
    id: user.sessionId,
    userId: user.id,
    expiresAt: user.expiresAt,
    authorizedUntil: user.authorizedUntil,
    impersonatedBy: user.impersonatedBy,
    provider: user.provider,
  };
}

export const getCurrentSession = cache(async () => {
  const token = await getSessionToken();
  return token
    ? toSession(await getCachedUserByTokenHash(hashToken(token)))
    : undefined;
});

// Authorization for a write reads the session row itself: a revoked session must
// fail at once, not once its cleared cache entry reaches the remote cache.
export const getFreshCurrentSession = async () => {
  const token = await getSessionToken();
  return token
    ? toSession(await loadUserByTokenHash(hashToken(token)))
    : undefined;
};

export const requireUser = cache(async function requireUser(
  access: AuthAccess = "authenticated",
  // Requested for explicit destinations and hosts that do not use the auth proxy.
  returnTo?: string,
) {
  const user = await getCurrentUser();

  if (!user) {
    if (returnTo === undefined) {
      const requestHeaders = await headers();
      const pathname = requestHeaders.get("x-pathname");
      returnTo = pathname
        ? pathname + (requestHeaders.get("x-search") ?? "")
        : undefined;
    }
    redirect(getLoginReturnPath(returnTo));
  }

  const requiredAccess = Array.isArray(access) ? access : [access];

  if (!requiredAccess.includes("authenticated")) {
    const hasPermission = user.roles.some((userRole) =>
      requiredAccess.includes(userRole),
    );

    if (!hasPermission) {
      redirect("/login");
    }
  }

  return user;
});
