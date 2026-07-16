import { cache } from "react";
import { cookies } from "next/headers";
import { generateToken, hashToken } from "./token";
import { AuthDeps } from "./types";
import { eq } from "drizzle-orm";
import type { User } from "@kenstack/types";

export type AuthAccess<TRole extends string> =
  "authenticated" | TRole | readonly TRole[];

export function createAuth<
  TSchema extends Record<string, unknown>,
  TRoles extends readonly string[],
>(
  deps: AuthDeps<TSchema, TRoles>,
  { getCurrentUser }: { getCurrentUser: () => Promise<User | undefined> },
) {
  const {
    db,
    tables: { sessions },
    logger,
  } = deps;

  const login = async (userId: number): Promise<void> => {
    await logout();

    const token = generateToken();
    const tokenHash = hashToken(token);

    const ttlInMs = 3600 * 24 * 30 * 1000; // 30 days
    const expiresAt = new Date(Date.now() + ttlInMs);

    const [sessionRow] = await db
      .insert(sessions)
      .values({
        userId,
        tokenHash,
        provider: "password",
        expiresAt,
      })
      .returning({ id: sessions.id });

    await logger.audit({
      action: "login",
      userId,
      rowId: sessionRow.id,
      table: "sessions",
    });

    const isProd =
      !process.env.DEVELOPMENT && process.env.NODE_ENV === "production";

    const cookieStore = await cookies();
    cookieStore.set({
      name: "sessionId",
      value: token,
      httpOnly: true,
      ...(isProd && { secure: true, domain: process.env.BASE_DOMAIN }),
      sameSite: "lax", // Strict can fail when doing a password request link from Gmail. ,
      expires: expiresAt,
      path: "/",
    });
  };

  const impersonate = async (userId: number): Promise<void> => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    const tokenHash = hashToken(token.value);
    const user = await getCurrentUser();
    if (!user) {
      return;
    }

    if (user.id === userId) {
      return;
    }

    if (user.impersonatedBy) {
      return;
    }

    if (!user.roles.includes("admin")) {
      return;
    }

    const [sess] = await db
      .update(sessions)
      .set({
        userId,
        impersonatedBy: user.id,
      })
      .where(eq(sessions.tokenHash, tokenHash))
      .returning({ id: sessions.id });

    await deps.logger.audit({
      action: "start-impersonation",
      userId: user.id,
      rowId: sess ? sess.id : null,
      table: "sessions",
      data: { impersonatedUserId: userId },
    });
  };

  const logout = async (): Promise<void> => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    const tokenHash = hashToken(token.value);

    const user = await getCurrentUser();
    if (!user) {
      return;
    }

    if (user.impersonatedBy) {
      const [sess] = await db
        .update(sessions)
        .set({
          userId: user.impersonatedBy,
          impersonatedBy: null,
        })
        .where(eq(sessions.tokenHash, tokenHash))
        .returning({ id: sessions.id });

      await deps.logger.audit({
        action: "end-impersonation",
        userId: user.impersonatedBy,
        rowId: sess ? sess.id : null,
        table: "sessions",
        data: { impersonatedUserId: user.id },
      });

      return;
    }

    const [deletedSession] = await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .returning({ id: sessions.id });

    await deps.logger.audit({
      action: "logout",
      userId: user.id,
      rowId: deletedSession ? deletedSession.id : null,
      table: "sessions",
    });

    const isProd =
      !process.env.DEVELOPMENT && process.env.NODE_ENV === "production";

    cookieStore.set({
      name: "sessionId",
      value: "",
      httpOnly: true,
      ...(isProd && { secure: true, domain: process.env.BASE_DOMAIN }),
      sameSite: "lax", // Strict can fail when doing a password request link from Gmail. ,
      expires: new Date(0),
      maxAge: 0,
      path: "/",
    });
  };

  const isAuthenticated = cache(async () => {
    return Boolean(await getCurrentUser());
  });

  const hasRole = cache(
    async (role: TRoles[number] | readonly TRoles[number][]) => {
      const user = await getCurrentUser();

      if (!user) {
        return false;
      }

      const requiredRoles = Array.isArray(role) ? role : [role];

      return user.roles.some((userRole) => requiredRoles.includes(userRole));
    },
  );

  const hasAccess = cache(async (access: AuthAccess<TRoles[number]>) => {
    if (access === "authenticated") {
      return isAuthenticated();
    }

    return hasRole(access);
  });

  return { login, impersonate, logout, isAuthenticated, hasRole, hasAccess };
}
