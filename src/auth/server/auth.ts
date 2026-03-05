import { cookies } from "next/headers";
import { generateToken, hashToken } from "./token";
import { AuthDeps, type Tables } from "./types";
import { eq } from "drizzle-orm";

import { type User } from "@kenstack/types";

export function createAuth<TSchema extends Tables>(
  deps: AuthDeps<TSchema>,
  { getCurrentUser }: { getCurrentUser: () => Promise<User | undefined> }
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
      entityId: sessionRow.id,
      entityType: "sessions",
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

  const logout = async (): Promise<void> => {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionId");

    if (!token) {
      return;
    }

    const tokenHash = hashToken(token.value);

    const user = await getCurrentUser();
    const [deletedSession] = await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, tokenHash))
      .returning({ id: sessions.id });
    await deps.logger.audit({
      action: "logout",
      userId: user ? user.id : null,
      entityId: deletedSession ? deletedSession.id : null,
      entityType: "sessions",
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
  return { login, logout };
}
