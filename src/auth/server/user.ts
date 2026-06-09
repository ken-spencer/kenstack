import { type AuthDeps } from "./types";
import { cache } from "react";
import { cookies } from "next/headers";
import { hashToken } from "./token";
import { and, isNull, eq, gt } from "drizzle-orm";
import { type User } from "@kenstack/types";
import { redirect } from "next/navigation";
import { selectMediaSubquery } from "@kenstack/db/tables";
import { createLoginPath } from "@kenstack/auth/returnTo";
import type { AuthAccess } from "@kenstack/auth/server/auth";
import { formatUserInitials, formatUserName } from "@kenstack/lib/user";

type RequireUserOptions<TRole extends string> =
  | {
      access: AuthAccess<TRole>;
      returnTo?: string | null;
    }
  | {
      access?: AuthAccess<TRole>;
      returnTo: string | null;
    };

export function createUser<
  TSchema extends Record<string, unknown>,
  TRoles extends readonly string[],
>(deps: AuthDeps<TSchema, TRoles>) {
  const {
    db,
    tables: { users, sessions },
  } = deps;

  const getUserBySessionToken = cache(
    async (token: string) /*: Promise<User | undefined>*/ => {
      if (!token) {
        return;
      }

      const tokenHash = hashToken(token);

      const [user] = await db
        .select({
          id: users.id,
          impersonatedBy: sessions.impersonatedBy,
          publicId: users.publicId,
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
    },
  );

  const getCurrentUser = async () /*: Promise<User<TRoles> | undefined>*/ => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    return getUserBySessionToken(token.value);
  };

  const requireUser = cache(async function requireUser(
    input?: AuthAccess<TRoles[number]> | RequireUserOptions<TRoles[number]>,
  ): Promise<User> {
    let access: AuthAccess<TRoles[number]>;
    let returnTo: string | null | undefined;

    if (
      input &&
      typeof input === "object" &&
      ("access" in input || "returnTo" in input)
    ) {
      access = input.access ?? "authenticated";
      returnTo = input.returnTo;
    } else {
      access = input ?? "authenticated";
    }

    const user = await getCurrentUser();
    const loginPath = createLoginPath(returnTo);

    if (!user) {
      redirect(loginPath);
    }

    const requiredAccess = Array.isArray(access) ? access : [access];

    if (!requiredAccess.includes("authenticated")) {
      const hasPermission = user.roles.some((userRole) =>
        requiredAccess.includes(userRole),
      );

      if (!hasPermission) {
        redirect(loginPath);
      }
    }

    return user;
  });

  return { getUserBySessionToken, getCurrentUser, requireUser };
}
