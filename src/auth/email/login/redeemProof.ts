import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@app/db";
import { login, logout } from "@kenstack/auth/server/auth";
import { verifications } from "@kenstack/db/tables/verification";
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
import {
  verificationEndedCode,
  verificationReplacedMessage,
} from "@kenstack/auth/email/verification/internal/policy";

// Public entry point for host account flows and Kenstack email login. Converts
// a proven email into an ordinary session, consuming the proof only once the
// account exists. A signed-in user, impersonating or not, who proves another
// address switches to that address's account; login() ends the current
// session first.
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

  if (authState.state === "authenticated" && authState.email === email) {
    userId = authState.userId;
  } else {
    if (
      authState.state !== "authenticated" &&
      (authState.state !== "proven" ||
        authState.email !== email ||
        authState.verificationId !== verificationId)
    ) {
      throw new ReturnedError(verificationReplacedMessage, {
        code: verificationEndedCode,
        status: 409,
      });
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
        // The proven address has no account, so the host's flow goes on to
        // create one. A signed-in visitor leaves their current account first,
        // or that flow would edit it; logout drops the verification cookie,
        // so the proof is put back for the new account's creation.
        if (authState.state === "authenticated") {
          const verificationKey = await getVerificationKey();
          const [verification] = await db
            .select({ expiresAt: verifications.expiresAt })
            .from(verifications)
            .where(eq(verifications.id, verificationId))
            .limit(1);
          await logout();
          if (authState.impersonatedBy) {
            await logout();
          }
          if (verificationKey && verification) {
            await setVerificationCookie(
              verificationKey,
              verification.expiresAt,
            );
          }
        }
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
