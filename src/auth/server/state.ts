import "server-only";

import { desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@app/db";
import { getVerificationKey } from "@kenstack/auth/email/verification/internal/cookie";
import { hashVerificationKey } from "@kenstack/auth/email/verification/internal/crypto";
import { verifications } from "@kenstack/db/tables/verification";
import { normalizeEmail } from "@kenstack/fields/email";
import type { User } from "@kenstack/types";
import type { Role } from "./types";
import { getCurrentUser, getFreshCurrentUser } from "./user";

type AuthState =
  | { state: "anonymous" }
  | { challengeKey: string; email: string; state: "code-sent" }
  // Proven means the browser controls this email and no session exists yet;
  // whether an account exists is looked up where it is acted on (email login,
  // the login handlers), never carried as state.
  | { email: string; state: "proven"; verificationId: number }
  | {
      avatar: User["avatar"];
      email: string;
      familyName: string;
      givenName: string;
      // Present while an admin is impersonating; the rest of the payload is
      // the impersonated user. Being signed in is one state either way.
      impersonatedBy?: number;
      initials: string;
      name: string;
      roles: Role[];
      state: "authenticated";
      userId: number;
    };

export type PublicAuthState =
  | { state: "anonymous" }
  | { email: string; state: "code-sent" }
  | { email: string; state: "proven" }
  | Extract<AuthState, { state: "authenticated" }>;

function toPublicAuthState(auth: AuthState): PublicAuthState {
  switch (auth.state) {
    case "anonymous":
    case "authenticated":
      return auth;
    case "code-sent":
    case "proven":
      return { email: auth.email, state: auth.state };
  }
}

async function resolveAuthState(
  user: User<Role> | undefined,
): Promise<AuthState> {
  // The current-user lookup already computes the display fields, so carrying
  // them costs nothing and saves user-info consumers another lookup.
  if (user) {
    return {
      avatar: user.avatar,
      email: normalizeEmail(user.email),
      familyName: user.familyName,
      givenName: user.givenName,
      ...(user.impersonatedBy ? { impersonatedBy: user.impersonatedBy } : {}),
      initials: user.initials,
      name: user.name,
      roles: user.roles,
      state: "authenticated",
      userId: user.id,
    };
  }

  const verificationKey = await getVerificationKey();
  if (!verificationKey) {
    return { state: "anonymous" };
  }
  const now = new Date();
  const [verification] = await db
    .select({
      challengeKey: verifications.challengeKey,
      email: verifications.email,
      endedAt: verifications.endedAt,
      expiresAt: verifications.expiresAt,
      id: verifications.id,
      provenAt: verifications.provenAt,
    })
    .from(verifications)
    .where(
      eq(
        verifications.verificationKeyHash,
        hashVerificationKey(verificationKey),
      ),
    )
    .orderBy(desc(verifications.createdAt), desc(verifications.id))
    .limit(1);

  if (!verification || verification.endedAt || verification.expiresAt <= now) {
    return { state: "anonymous" };
  }

  if (!verification.provenAt) {
    return {
      challengeKey: verification.challengeKey,
      email: verification.email,
      state: "code-sent",
    };
  }

  return {
    email: verification.email,
    state: "proven",
    verificationId: verification.id,
  };
}

export const loadAuthState = cache(async () =>
  resolveAuthState(await getCurrentUser()),
);

export async function loadFreshAuthState(): Promise<AuthState> {
  return resolveAuthState(await getFreshCurrentUser());
}

export async function loadPublicAuthState(): Promise<PublicAuthState> {
  return toPublicAuthState(await loadAuthState());
}

export async function loadFreshPublicAuthState(): Promise<PublicAuthState> {
  return toPublicAuthState(await loadFreshAuthState());
}
