import { type AuthDeps } from "./types";
import { cache } from "react";
import { cookies } from "next/headers";
import { hashToken } from "./token";
import { sql, and, isNull, eq, gt } from "drizzle-orm";
import { type User } from "@kenstack/types";
import { redirect } from "next/navigation";
import { selectImageSubquery } from "@kenstack/db/tables";

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
          familyName: users.familyName,
          name: sql<string>`trim(${users.givenName} || ' ' || ${users.familyName})`.as(
            "name",
          ),
          email: users.email,
          avatar: selectImageSubquery(users.avatar, "square"),
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
        initials: user.givenName.slice(0, 1) + user.familyName.slice(0, 1),
      };
    },
  );

  // const loadUser = cache(async (userId: number): Promise<User | undefined> => {
  //   const [user] = await db
  //     .select({
  //       id: users.id,
  //       impersonatedBy: sessions.impersonatedBy,
  //       publicId: users.publicId,
  //       givenName: users.givenName,
  //       familyName: users.familyName,
  //       name: sql<string>`trim(${users.givenName} || ' ' || ${users.familyName})`.as(
  //         "name",
  //       ),
  //       email: users.email,
  //       avatar: selectImageSubquery(users.avatar, "square"),
  //       roles: users.roles,
  //     })
  //     .from(users)
  //     .where(and(eq(users.id, userId), isNull(users.deletedAt)))
  //     .limit(1);

  //   if (!user) {
  //     return undefined;
  //   }

  //   const { impersonatedBy, ...publicUser } = user;

  //   return {
  //     ...publicUser,
  //     ...(impersonatedBy ? { impersonatedBy } : {}),
  //     initials: user.givenName.slice(0, 1) + user.familyName.slice(0, 1),
  //   };
  // });

  const getCurrentUser = async () /*: Promise<User<TRoles> | undefined>*/ => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    return getUserBySessionToken(token.value);
  };

  const requireUser = cache(
    async (
      role?: TRoles[number] | readonly TRoles[number][],
    ): Promise<User> => {
      const user = await getCurrentUser();

      if (!user) {
        redirect("/login");
      }

      if (role) {
        const requiredRoles = Array.isArray(role) ? role : [role];

        const hasPermission = user.roles.some((userRole) =>
          requiredRoles.includes(userRole),
        );

        if (!hasPermission) {
          redirect("/login");
        }
      }

      return user;
    },
  );

  return { getUserBySessionToken, getCurrentUser, requireUser };
}
