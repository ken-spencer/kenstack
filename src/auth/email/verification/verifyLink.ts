import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@app/db";
import { verifications } from "@kenstack/db/tables/verification";

import { getVerificationKey, setVerificationCookie } from "./internal/cookie";
import { hashVerificationKey, hashVerificationToken } from "./internal/crypto";
import {
  proveVerification,
  type VerificationBinding,
} from "./internal/repository";
import type { DbTransaction } from "@kenstack/db/types";

async function inspectLink(
  tx: DbTransaction,
  token: string,
  { kind = "login", userId = null }: Partial<VerificationBinding>,
  currentVerificationKey: string | undefined,
) {
  const [record] = await tx
    .select({
      endedAt: verifications.endedAt,
      email: verifications.email,
      expiresAt: verifications.expiresAt,
      isDecoy: verifications.isDecoy,
      kind: verifications.kind,
      userId: verifications.userId,
      verificationId: verifications.id,
      verificationKeyHash: verifications.verificationKeyHash,
      provenAt: verifications.provenAt,
    })
    .from(verifications)
    .where(eq(verifications.tokenHash, hashVerificationToken(token)))
    .limit(1)
    .for("update");

  if (
    !record ||
    record.isDecoy ||
    record.kind !== kind ||
    record.userId !== userId
  ) {
    return { state: "invalid" as const };
  }
  // Latest of its own kind and account: another kind's request in the same
  // browser, such as a login while a change is pending, does not replace it.
  const [latestVerification] = await tx
    .select({ id: verifications.id })
    .from(verifications)
    .where(
      and(
        eq(verifications.verificationKeyHash, record.verificationKeyHash),
        eq(verifications.kind, kind),
        userId === null
          ? isNull(verifications.userId)
          : eq(verifications.userId, userId),
      ),
    )
    .orderBy(desc(verifications.createdAt), desc(verifications.id))
    .limit(1);

  if (!latestVerification || latestVerification.id !== record.verificationId) {
    return { state: "invalid" as const };
  }

  if (record.endedAt || record.expiresAt <= new Date()) {
    return { state: "expired" as const };
  }
  const isRequestingBrowser =
    currentVerificationKey !== undefined &&
    hashVerificationKey(currentVerificationKey) === record.verificationKeyHash;
  if (kind === "login" && !isRequestingBrowser) {
    return { state: "wrong-browser" as const };
  }

  return { isRequestingBrowser, record, state: "acceptable" as const };
}

// Applies every rule verifyLink applies and writes nothing.
export async function checkLink(
  token: string,
  binding: Partial<VerificationBinding>,
) {
  const currentVerificationKey = await getVerificationKey();
  return (
    await db.transaction((tx) =>
      inspectLink(tx, token, binding, currentVerificationKey),
    )
  ).state;
}

// A login link must be opened in the browser that requested it, since that
// browser's chain is what the proof signs in. An email change is bound to the
// account that requested it instead: the link works wherever that account is
// signed in, so a sign-in between request and click, which replaces the
// browser's chain, does not strand the request.
export async function verifyLink(
  token: string,
  binding: Partial<VerificationBinding> = {},
): Promise<
  | { state: "expired" | "invalid" | "wrong-browser" }
  | { email: string; state: "proven"; verificationId: number }
> {
  const currentVerificationKey = await getVerificationKey();
  const outcome = await db.transaction(async (tx) => {
    const inspected = await inspectLink(
      tx,
      token,
      binding,
      currentVerificationKey,
    );
    if (inspected.state !== "acceptable") {
      return inspected;
    }
    const { isRequestingBrowser, record } = inspected;
    const expiresAt = record.provenAt
      ? record.expiresAt
      : await proveVerification(tx, {
          now: new Date(),
          verificationId: record.verificationId,
        });
    if (!expiresAt) {
      return { state: "invalid" as const };
    }

    return {
      email: record.email,
      expiresAt,
      verificationId: record.verificationId,
      verificationKey: isRequestingBrowser ? currentVerificationKey : undefined,
      state: "proven" as const,
    };
  });

  if (outcome.state !== "proven") {
    return outcome;
  }

  if (outcome.verificationKey) {
    await setVerificationCookie(outcome.verificationKey, outcome.expiresAt);
  }
  return {
    email: outcome.email,
    verificationId: outcome.verificationId,
    state: outcome.state,
  };
}
