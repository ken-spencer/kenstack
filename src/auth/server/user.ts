import { cache } from "react";
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

async function loadFreshUserBySessionToken(token: string) {
  if (!token) {
    return;
  }
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
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, sql`now()`),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  if (!user) {
    return undefined;
  }

  const { impersonatedBy, ...publicUser } = user;

  return {
    ...publicUser,
    // Persisted values grant authority only while the host still registers
    // them, so removing a role disables it without rewriting stored rows.
    roles: user.roles.filter((role): role is Role =>
      Object.hasOwn(roles, role),
    ),
    ...(impersonatedBy ? { impersonatedBy } : {}),
    name: formatUserName(user),
    initials: formatUserInitials(user),
  };
}

const getUserBySessionToken = cache(loadFreshUserBySessionToken);

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
