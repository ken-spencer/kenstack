import { type AuthDeps } from "./types";
import { cache } from "react";
import { cookies } from "next/headers";
import { hashToken } from "./token";
import { and, isNull, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { selectMediaSubquery } from "@kenstack/db/tables";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import type { User } from "@kenstack/types";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";

export function createUser<
  TSchema extends Record<string, unknown>,
  TRoles extends readonly string[],
>(deps: AuthDeps<TSchema, TRoles>) {
  const {
    db,
    tables: { users, sessions },
  } = deps;

  const getUserBySessionToken = cache(async (token: string) => {
    if (!token) {
      return;
    }
    const tokenHash = hashToken(token);

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
          eq(sessions.tokenHash, tokenHash),
          gt(sessions.expiresAt, new Date()),
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
      ...(impersonatedBy ? { impersonatedBy } : {}),
      name: formatUserName(user),
      initials: formatUserInitials(user),
    };
  });

  const getCurrentUser = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    return getUserBySessionToken(token.value);
  };

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

  return { getUserBySessionToken, getCurrentUser, requireUser };
}
