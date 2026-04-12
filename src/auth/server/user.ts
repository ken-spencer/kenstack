import { type AuthDeps, type Tables } from "./types";
import { cache } from "react";
import { cookies } from "next/headers";
import { hashToken } from "./token";
import { sql, and, isNull, eq, gt } from "drizzle-orm";
import { type User } from "@kenstack/types";
import { redirect } from "next/navigation";

export function createUser<
  TSchema extends Tables,
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
          publicId: users.publicId,
          firstName: users.firstName,
          lastName: users.lastName,
          name: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`.as(
            "name",
          ),
          email: users.email,
          // avatar: users.avatar,
          roles: users.roles,
          // provider: sessions.provider,
          // expiresAt: sessions.expiresAt,
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
      return {
        ...user,
        avatar: null,
        initials: user.firstName.slice(0, 1) + user.lastName.slice(0, 1),
      };
    },
  );

  const loadUser = cache(async (userId: number): Promise<User | undefined> => {
    const [user] = await db
      .select({
        id: users.id,
        publicId: users.publicId,
        firstName: users.firstName,
        lastName: users.lastName,
        name: sql<string>`trim(${users.firstName} || ' ' || ${users.lastName})`.as(
          "name",
        ),
        email: users.email,
        // avatar: users.avatar,
        roles: users.roles,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    return {
      ...user,
      avatar: null,
      initials: user.firstName.slice(0, 1) + user.lastName.slice(0, 1),
    };
  });

  const getCurrentUser = async () /*: Promise<User<TRoles> | undefined>*/ => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    return getUserBySessionToken(token.value);
  };

  interface RequireUserOptions {
    role?: TRoles[number] | readonly TRoles[number][];
    redirectTo?: string;
  }

  const requireUser = cache(
    async (options?: RequireUserOptions): Promise<User> => {
      const user = await getCurrentUser();

      if (!user) {
        redirect(options?.redirectTo || "/login");
      }

      if (options?.role) {
        const requiredRoles = Array.isArray(options.role)
          ? options.role
          : [options.role];

        const hasPermission = user.roles.some((userRole) =>
          requiredRoles.includes(userRole),
        );

        if (!hasPermission) {
          redirect(options?.redirectTo || "/login");
        }
      }

      return user;
    },
  );

  return { getUserBySessionToken, getCurrentUser, loadUser, requireUser };
}
