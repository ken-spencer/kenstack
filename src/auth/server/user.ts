import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { and, isNull, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@app/db";
import { modules } from "@app/modules";
import roles from "@app/roles";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import { selectMediaSubquery } from "@kenstack/db/queries/media";
import { sessions } from "@kenstack/db/tables/sessions";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";
import type { User } from "@kenstack/types";

import { hashToken } from "./token";
import type { Role } from "./types";

const users = modules.users.admin.table;
const maxSessionCacheSeconds = 15 * 60;

export function sessionCacheTag(tokenHash: string) {
  return `auth-session:${tokenHash}`;
}

export function userSessionsCacheTag(userId: number) {
  return `auth-user-sessions:${userId}`;
}

async function loadUserByTokenHash(tokenHash: string) {
  const [user] = await db
    .select({
      id: users.id,
      impersonatedBy: sessions.impersonatedBy,
      givenName: users.givenName,
      middleName: users.middleName,
      familyName: users.familyName,
      email: users.email,
      avatar: selectMediaSubquery(users.avatar, "square"),
      roles: users.roles,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, sql`now()`),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return user;
}

// Cached per session for up to fifteen minutes; login, logout, impersonation,
// password changes, and user edits revalidate the tags so a change takes
// effect on the next request. getFreshCurrentUser bypasses it.
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

  return user;
}

// Role filtering and display names are applied after the cache so a registry
// change applies to cached sessions immediately.
function toPublicUser(
  user: NonNullable<Awaited<ReturnType<typeof loadUserByTokenHash>>>,
) {
  return {
    id: user.id,
    givenName: user.givenName,
    middleName: user.middleName,
    familyName: user.familyName,
    email: user.email,
    avatar: user.avatar,
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

async function getCurrentUserUsing(
  getUser: (token: string) => ReturnType<typeof loadFreshUserBySessionToken>,
) {
  const sessionCookie = (await cookies()).get("sessionId");

  if (!sessionCookie) {
    return;
  }

  return getUser(sessionCookie.value);
}

export const getCurrentUser = () => getCurrentUserUsing(getUserBySessionToken);

export const getFreshCurrentUser = () =>
  getCurrentUserUsing(loadFreshUserBySessionToken);

export const getCurrentSession = cache(async () => {
  const sessionCookie = (await cookies()).get("sessionId");

  if (!sessionCookie) {
    return;
  }

  const [session] = await db
    .select({
      createdAt: sessions.createdAt,
      impersonatedBy: sessions.impersonatedBy,
      provider: sessions.provider,
      userId: sessions.userId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(sessionCookie.value)),
        gt(sessions.expiresAt, sql`now()`),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return session;
});

export const requireUser = cache(async function requireUser(
  access: AuthAccess = "authenticated",
): Promise<User<Role>> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
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
