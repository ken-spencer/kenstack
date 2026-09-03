import "server-only";

import { desc, eq } from "drizzle-orm";
import { db } from "@app/db";
import { getCurrentUser } from "@kenstack/auth/server/user";
import { verifications } from "@kenstack/db/tables/verification";
import { normalizeEmail } from "@kenstack/fields/email";

import { getVerificationKey, setVerificationCookie } from "./internal/cookie";
import { hashVerificationKey, hashVerificationToken } from "./internal/crypto";
import { proveVerification } from "./internal/repository";

export async function verifyLink(
  token: string,
): Promise<
  | { state: "expired" | "invalid" | "wrong-account" | "wrong-browser" }
  | { email: string; state: "proven"; verificationId: number }
> {
  const currentUser = await getCurrentUser();

  const currentVerificationKey = await getVerificationKey();
  const outcome = await db.transaction(async (tx) => {
    const [record] = await tx
      .select({
        endedAt: verifications.endedAt,
        email: verifications.email,
        expiresAt: verifications.expiresAt,
        isDecoy: verifications.isDecoy,
        verificationId: verifications.id,
        verificationKeyHash: verifications.verificationKeyHash,
        provenAt: verifications.provenAt,
      })
      .from(verifications)
      .where(eq(verifications.tokenHash, hashVerificationToken(token)))
      .limit(1)
      .for("update");

    if (!record || record.isDecoy) {
      return { state: "invalid" as const };
    }
    const [latestVerification] = await tx
      .select({ id: verifications.id })
      .from(verifications)
      .where(eq(verifications.verificationKeyHash, record.verificationKeyHash))
      .orderBy(desc(verifications.createdAt), desc(verifications.id))
      .limit(1);

    if (
      !latestVerification ||
      latestVerification.id !== record.verificationId
    ) {
      return { state: "invalid" as const };
    }

    const now = new Date();
    if (record.endedAt || record.expiresAt <= now) {
      return { state: "expired" as const };
    }
    if (
      currentUser &&
      (currentUser.impersonatedBy ||
        record.email !== normalizeEmail(currentUser.email))
    ) {
      return { state: "wrong-account" as const };
    }

    if (
      !currentVerificationKey ||
      hashVerificationKey(currentVerificationKey) !== record.verificationKeyHash
    ) {
      return { state: "wrong-browser" as const };
    }
    const expiresAt = record.provenAt
      ? record.expiresAt
      : await proveVerification(tx, {
          now,
          verificationId: record.verificationId,
        });
    if (!expiresAt) {
      return { state: "invalid" as const };
    }

    return {
      email: record.email,
      expiresAt,
      verificationId: record.verificationId,
      verificationKey: currentVerificationKey,
      state: "proven" as const,
    };
  });

  if (outcome.state !== "proven") {
    return outcome;
  }

  await setVerificationCookie(outcome.verificationKey, outcome.expiresAt);
  return {
    email: outcome.email,
    verificationId: outcome.verificationId,
    state: outcome.state,
  };
}
