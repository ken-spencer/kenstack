import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { io } from "next/cache";
import { cache } from "react";

import { db } from "@app/db";
import { getVerificationKey } from "@kenstack/auth/email/verification/internal/cookie";
import { hashVerificationKey } from "@kenstack/auth/email/verification/internal/crypto";
import { verifications } from "@kenstack/db/tables/verification";
import { normalizeEmail } from "@kenstack/fields/email";
import { getCurrentUser, getFreshCurrentUser } from "./user";
import { getUsersModule } from "./getUsersModule";
import { resolveLoginDestination } from "./loginDestination";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type AuthState =
  | { state: "anonymous" }
  | { challengeKey: string; email: string; state: "code-sent" }
  // Proven means the browser controls this email and no session exists yet;
  // whether an account exists is looked up where it is acted on (email login,
  // the login handlers), never carried as state.
  | { email: string; state: "proven"; verificationId: number }
  | Awaited<ReturnType<typeof toAuthenticatedState>>;

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

// The current-user lookup already computes the display fields, so carrying them costs nothing and
// saves user-info consumers another lookup.
async function toAuthenticatedState(user: CurrentUser) {
  // publicUser may compare stored values with the clock, which must not run while prerendering.
  await io();
  return {
    // Kenstack's own fields follow, so a site's cannot replace them.
    ...getUsersModule().publicUser(user),
    avatar: user.avatar,
    email: normalizeEmail(user.email),
    familyName: user.familyName,
    givenName: user.givenName,
    // Set while an admin is impersonating; the rest of the payload is the impersonated user. Being
    // signed in is one state either way.
    impersonatedBy: user.impersonatedBy,
    initials: user.initials,
    name: user.name,
    roles: user.roles,
    state: "authenticated" as const,
    userId: user.id,
  };
}

// This browser's latest live login verification, from its verification cookie, whatever the session.
export async function loadLoginVerification() {
  const verificationKey = await getVerificationKey();
  if (!verificationKey) {
    return undefined;
  }
  await io();
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
      and(
        eq(
          verifications.verificationKeyHash,
          hashVerificationKey(verificationKey),
        ),
        // Only a login proof makes a browser "proven"; an email change's
        // proof belongs to its signed-in account.
        eq(verifications.kind, "login"),
      ),
    )
    .orderBy(desc(verifications.createdAt), desc(verifications.id))
    .limit(1);

  return verification && !verification.endedAt && verification.expiresAt > now
    ? verification
    : undefined;
}

async function resolveAuthState(
  user: CurrentUser | undefined,
): Promise<AuthState> {
  if (user) {
    return toAuthenticatedState(user);
  }

  const verification = await loadLoginVerification();
  if (!verification) {
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

// The session snapshot for every access check, writes included. Each change to a session or its
// user clears it at once, so it is current.
export const loadAuthState = cache(async () =>
  resolveAuthState(await getCurrentUser()),
);

// Only for reading the session or user again after this request has changed it.
async function loadFreshAuthState(): Promise<AuthState> {
  return resolveAuthState(await getFreshCurrentUser());
}

export async function loadPublicAuthState(): Promise<PublicAuthState> {
  return toPublicAuthState(await loadAuthState());
}

// Only for reading the session or user again after this request has changed it.
export async function loadFreshPublicAuthState(): Promise<PublicAuthState> {
  return toPublicAuthState(await loadFreshAuthState());
}

// The `userInfo` of a success response after this request changed the user or session. Kenstack's
// Form adopts it as this tab's own change, with the account's login destination.
export async function loadUserInfo() {
  const authState = await loadFreshPublicAuthState();
  return {
    authState,
    loginDestination:
      authState.state === "authenticated"
        ? await resolveLoginDestination(undefined)
        : undefined,
  };
}
