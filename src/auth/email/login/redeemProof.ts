import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@app/db";
import { login } from "@kenstack/auth/server/auth";
import { loadFreshAuthState } from "@kenstack/auth/server/state";
import { ReturnedError } from "@kenstack/api";
import { normalizeEmail } from "@kenstack/fields/email";

import {
  consumeVerification,
  restoreVerification,
} from "@kenstack/auth/email/verification/internal/repository";
import {
  getVerificationKey,
  setVerificationCookie,
} from "@kenstack/auth/email/verification/internal/cookie";
import { verificationEndedMessage } from "@kenstack/auth/email/verification/internal/policy";

// Public entry point for host account flows and Kenstack email login. Converts
// a proven email into an ordinary session, consuming the proof only once the
// account exists.
export async function redeemEmailProof(
  {
    email,
    verificationId,
  }: {
    email: string;
    verificationId: number;
  },
  { allowUnregistered = false }: { allowUnregistered?: boolean } = {},
) {
  const authState = await loadFreshAuthState();
  let userId: number | undefined;

  if (authState.state === "authenticated") {
    if (authState.impersonatedBy || authState.email !== email) {
      throw new ReturnedError(
        "That sign-in link is not valid for the current account.",
        { status: 409 },
      );
    }
    userId = authState.userId;
  } else {
    if (
      authState.state !== "proven" ||
      authState.email !== email ||
      authState.verificationId !== verificationId
    ) {
      throw new ReturnedError(verificationEndedMessage, { status: 409 });
    }

    userId = (
      await db.query.users.findFirst({
        columns: { id: true },
        where: (users, { and, isNull }) =>
          and(
            sql`lower(${users.email}) = ${normalizeEmail(email)}`,
            isNull(users.deletedAt),
          ),
      })
    )?.id;
    if (userId === undefined) {
      if (allowUnregistered) {
        return;
      }
      throw new ReturnedError("No account was found for that email address.", {
        status: 409,
      });
    }
  }

  // Another request (a second tab, another flow) consumed this proof first, so
  // that sign-in has happened; this tab only needs to reload.
  const verification = await consumeVerification(verificationId, email);
  if (!verification) {
    throw new ReturnedError(
      "You've already signed in. Refresh the page to continue.",
      { status: 409 },
    );
  }

  const verificationKey = await getVerificationKey();
  try {
    await login(userId, "email");
  } catch (error) {
    await restoreVerification(verificationId);
    if (verificationKey) {
      await setVerificationCookie(verificationKey, verification.expiresAt);
    }
    throw error;
  }

  return userId;
}
