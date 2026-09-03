import { cache } from "react";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@app/db";
import { verificationCookie } from "@kenstack/auth/email/verification/internal/cookie";
import { sessions, type LoginProvider } from "@kenstack/db/tables/sessions";
import { audit } from "@kenstack/logger";

import { generateToken, hashToken } from "./token";
import type { Role } from "./types";
import { getCurrentUser, sessionCacheTag } from "./user";

export type AuthAccess = "authenticated" | Role | readonly Role[];

export async function login(
  userId: number,
  provider: LoginProvider = "password",
): Promise<void> {
  await logout();

  const token = generateToken();

  const ttlInMs = 3600 * 24 * 30 * 1000; // 30 days
  const expiresAt = new Date(Date.now() + ttlInMs);

  const [sessionRow] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash: hashToken(token),
      provider,
      expiresAt,
    })
    .returning({ id: sessions.id });

  await audit({
    action: "login",
    userId,
    rowId: sessionRow.id,
    table: "sessions",
    data: { provider },
  });

  const isProd =
    !process.env.DEVELOPMENT && process.env.NODE_ENV === "production";

  (await cookies()).set({
    name: "sessionId",
    value: token,
    httpOnly: true,
    ...(isProd && { secure: true, domain: process.env.BASE_DOMAIN }),
    sameSite: "lax", // Strict can fail when doing a password request link from Gmail.
    expires: expiresAt,
    path: "/",
  });
}

export async function impersonate(userId: number): Promise<void> {
  const sessionCookie = (await cookies()).get("sessionId");

  if (!sessionCookie) {
    return;
  }

  const user = await getCurrentUser();
  if (!user || user.id === userId || user.impersonatedBy) {
    return;
  }

  if (!user.roles.includes("admin")) {
    return;
  }

  const tokenHash = hashToken(sessionCookie.value);
  const [session] = await db
    .update(sessions)
    .set({
      userId,
      impersonatedBy: user.id,
    })
    .where(eq(sessions.tokenHash, tokenHash))
    .returning({ id: sessions.id });
  // Invalidate right after the write so a failed audit cannot leave the
  // previous identity cached.
  revalidateTag(sessionCacheTag(tokenHash), { expire: 0 });

  await audit({
    action: "start-impersonation",
    userId: user.id,
    rowId: session ? session.id : null,
    table: "sessions",
    data: { impersonatedUserId: userId },
  });
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(verificationCookie);
  const sessionCookie = cookieStore.get("sessionId");

  if (!sessionCookie) {
    return;
  }

  const tokenHash = hashToken(sessionCookie.value);
  const user = await getCurrentUser();
  if (!user) {
    return;
  }

  if (user.impersonatedBy) {
    const [session] = await db
      .update(sessions)
      .set({
        userId: user.impersonatedBy,
        impersonatedBy: null,
      })
      .where(eq(sessions.tokenHash, tokenHash))
      .returning({ id: sessions.id });
    revalidateTag(sessionCacheTag(tokenHash), { expire: 0 });

    await audit({
      action: "end-impersonation",
      userId: user.impersonatedBy,
      rowId: session ? session.id : null,
      table: "sessions",
      data: { impersonatedUserId: user.id },
    });

    return;
  }

  const [deletedSession] = await db
    .delete(sessions)
    .where(eq(sessions.tokenHash, tokenHash))
    .returning({ id: sessions.id });
  revalidateTag(sessionCacheTag(tokenHash), { expire: 0 });

  await audit({
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
    sameSite: "lax", // Strict can fail when doing a password request link from Gmail.
    expires: new Date(0),
    maxAge: 0,
    path: "/",
  });
}

export const isAuthenticated = cache(async () =>
  Boolean(await getCurrentUser()),
);

export const hasRole = cache(async (role: Role | readonly Role[]) => {
  const user = await getCurrentUser();

  if (!user) {
    return false;
  }

  const requiredRoles = Array.isArray(role) ? role : [role];

  return user.roles.some((userRole) => requiredRoles.includes(userRole));
});

export const hasAccess = cache(async (access: AuthAccess) => {
  if (access === "authenticated") {
    return isAuthenticated();
  }

  return hasRole(access);
});
