import { type AuthDeps } from "./types";
import { cache } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { hashToken } from "./token";
import { and, isNull, eq, gt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { selectMediaSubquery } from "@kenstack/db/tables";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import type { User } from "@kenstack/types";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";

// "use cache" serializes any values a cached function closes over into its
// cache key, so the cached wrapper can't live inside createUser where it
// would capture the non-serializable db. createUser registers the query here
// at module scope instead (module bindings are referenced, not captured).
let loadUserByTokenHash: (
  tokenHash: string,
) => Promise<{ expiresAt: Date; user: User } | undefined>;

const maxSessionCacheSeconds = 15 * 60;

export function sessionCacheTag(tokenHash: string) {
  return `auth-session:${tokenHash}`;
}

export function userSessionsCacheTag(userId: number) {
  return `auth-user-sessions:${userId}`;
}

async function getCachedUserByTokenHash(tokenHash: string) {
  "use cache: remote";
  cacheTag(sessionCacheTag(tokenHash));

  const result = await loadUserByTokenHash(tokenHash);
  const expiresInSeconds = result
    ? Math.max(1, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000))
    : maxSessionCacheSeconds;
  const expire = Math.min(maxSessionCacheSeconds, expiresInSeconds);

  cacheLife({ revalidate: Math.max(0, expire - 1), expire });

  if (!result) {
    return undefined;
  }

  cacheTag(userSessionsCacheTag(result.user.id));

  return result.user;
}

export function createUser<
  TSchema extends Record<string, unknown>,
  TRoles extends readonly string[],
>(deps: AuthDeps<TSchema, TRoles>) {
  const {
    db,
    tables: { users, sessions },
  } = deps;

  const queryUserByTokenHash = async (tokenHash: string) => {
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

    if (!user) {
      return undefined;
    }

    const { expiresAt, impersonatedBy, ...publicUser } = user;

    return {
      expiresAt,
      user: {
        ...publicUser,
        ...(impersonatedBy ? { impersonatedBy } : {}),
        name: formatUserName(user),
        initials: formatUserInitials(user),
      },
    };
  };

  loadUserByTokenHash = queryUserByTokenHash;

  const getUserBySessionToken = cache(async (token: string) => {
    if (!token) {
      return;
    }

    return getCachedUserByTokenHash(hashToken(token)) as Promise<
      | NonNullable<Awaited<ReturnType<typeof queryUserByTokenHash>>>["user"]
      | undefined
    >;
  });

  const getCurrentUser = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    return getUserBySessionToken(token.value);
  };

  const getCurrentSession = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    const tokenHash = hashToken(token.value);
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
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, sql`now()`),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return session;
  });

  const requireUser = cache(async function requireUser(
    access: AuthAccess<TRoles[number]> = "authenticated",
  ): Promise<User<TRoles>> {
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

  return {
    getUserBySessionToken,
    getCurrentSession,
    getCurrentUser,
    requireUser,
  };
}
