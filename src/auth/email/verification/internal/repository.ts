import "server-only";

import { and, desc, eq, gt, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@app/db";
import { verifications } from "@kenstack/db/tables/verification";
import type { DbTransaction } from "@kenstack/db/types";

import { isVerificationCodeMatch, type createChallengeSecrets } from "./crypto";
import { calculateProofExpiresAt, resolveCodeOutcome } from "./policy";

// What a row may prove and for whom. An email change belongs to the account
// that asked for it; a login belongs to nobody yet.
export type VerificationBinding = Pick<
  typeof verifications.$inferSelect,
  "kind" | "userId"
>;

type VerificationRecord = Awaited<
  ReturnType<typeof loadVerificationsForUpdate>
>[number];

export async function endVerification(
  tx: DbTransaction,
  verificationId: number,
  endedAt: Date,
) {
  await tx
    .update(verifications)
    .set({ endedAt })
    .where(eq(verifications.id, verificationId));
}

export async function deleteVerification(
  tx: DbTransaction,
  verificationId: number,
) {
  await tx
    .delete(verifications)
    .where(
      and(eq(verifications.id, verificationId), isNull(verifications.provenAt)),
    );
}

export async function createVerification(
  tx: DbTransaction,
  {
    email,
    expiresAt,
    failedAttempts = 0,
    isDecoy,
    kind,
    userId,
    verificationKeyHash,
    secrets,
  }: VerificationBinding & {
    email: string;
    expiresAt: Date;
    failedAttempts?: number;
    isDecoy: boolean;
    verificationKeyHash: string;
    secrets: ReturnType<typeof createChallengeSecrets>;
  },
) {
  return (
    await tx
      .insert(verifications)
      .values({
        challengeKey: secrets.challengeKey,
        codeHash: secrets.codeHash,
        codeSalt: secrets.codeSalt,
        email,
        expiresAt,
        failedAttempts,
        isDecoy,
        kind,
        userId,
        verificationKeyHash,
        tokenHash: secrets.tokenHash,
      })
      .returning({ id: verifications.id })
  )[0];
}

export async function markVerificationDecoy(
  tx: DbTransaction,
  verificationId: number,
) {
  await tx
    .update(verifications)
    .set({ isDecoy: true })
    .where(
      and(
        eq(verifications.id, verificationId),
        isNull(verifications.endedAt),
        isNull(verifications.provenAt),
      ),
    );
}

export async function loadVerificationsForUpdate(
  tx: DbTransaction,
  verificationKeyHash: string,
) {
  return tx
    .select({
      challengeKey: verifications.challengeKey,
      codeHash: verifications.codeHash,
      codeSalt: verifications.codeSalt,
      createdAt: verifications.createdAt,
      endedAt: verifications.endedAt,
      email: verifications.email,
      expiresAt: verifications.expiresAt,
      failedAttempts: verifications.failedAttempts,
      id: verifications.id,
      kind: verifications.kind,
      provenAt: verifications.provenAt,
      userId: verifications.userId,
    })
    .from(verifications)
    .where(eq(verifications.verificationKeyHash, verificationKeyHash))
    .orderBy(desc(verifications.createdAt), desc(verifications.id))
    .for("update");
}

// Ends a verification so it cannot be redeemed again. Returns nothing when
// another request already ended it. Callers have just read it as proven and
// unexpired.
export async function consumeVerification(
  verificationId: number,
  email: string,
  tx: Pick<DbTransaction, "update"> = db,
  binding: VerificationBinding = { kind: "login", userId: null },
) {
  return (
    await tx
      .update(verifications)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(verifications.id, verificationId),
          eq(verifications.email, email),
          eq(verifications.isDecoy, false),
          eq(verifications.kind, binding.kind),
          binding.userId === null
            ? isNull(verifications.userId)
            : eq(verifications.userId, binding.userId),
          gt(verifications.expiresAt, new Date()),
          isNull(verifications.endedAt),
          isNotNull(verifications.provenAt),
        ),
      )
      .returning({
        expiresAt: verifications.expiresAt,
        id: verifications.id,
      })
  )[0];
}

// Reopens a verification that consumeVerification just ended, when the sign-in
// it was consumed for did not complete.
export async function restoreVerification(verificationId: number) {
  await db
    .update(verifications)
    .set({ endedAt: null })
    .where(eq(verifications.id, verificationId));
}

export async function resolveCodeAttempt(
  tx: DbTransaction,
  {
    code,
    current,
    previous,
  }: {
    code: string;
    current: VerificationRecord;
    previous: VerificationRecord[];
  },
) {
  const matchesCurrent = isVerificationCodeMatch(
    code,
    current.codeSalt,
    current.codeHash,
  );
  const matchesSuperseded = previous.some(({ codeHash, codeSalt }) =>
    isVerificationCodeMatch(code, codeSalt, codeHash),
  );

  // A code from an ended or expired request to the same address — including
  // chains under a rotated browser key after a restart or sign-out — reports
  // "expired" rather than "incorrect" and consumes no attempt, since retyping
  // it can never succeed, even on the last permitted attempt. Best effort:
  // swept rows are unknowable.
  if (
    !matchesCurrent &&
    !matchesSuperseded &&
    (
      await tx
        .select({
          codeHash: verifications.codeHash,
          codeSalt: verifications.codeSalt,
        })
        .from(verifications)
        .where(
          and(
            eq(verifications.email, current.email),
            ne(verifications.id, current.id),
            or(
              isNotNull(verifications.endedAt),
              lte(verifications.expiresAt, new Date()),
            ),
          ),
        )
        .orderBy(desc(verifications.createdAt))
        .limit(5)
    ).some(({ codeHash, codeSalt }) =>
      isVerificationCodeMatch(code, codeSalt, codeHash),
    )
  ) {
    return "expired" as const;
  }

  const outcome = resolveCodeOutcome({
    failedAttempts: current.failedAttempts,
    matchesCurrent,
    matchesSuperseded,
  });

  if (outcome.status === "incorrect") {
    await tx
      .update(verifications)
      .set({ failedAttempts: outcome.failedAttempts })
      .where(eq(verifications.id, current.id));
  }

  return outcome.status;
}

// The guarded verification update is the single arbiter between concurrent
// code and link redemptions; a false return means another path already settled
// this verification.
export async function proveVerification(
  tx: DbTransaction,
  {
    now,
    verificationId,
  }: {
    now: Date;
    verificationId: number;
  },
) {
  const expiresAt = calculateProofExpiresAt(now);
  if (
    !(
      await tx
        .update(verifications)
        .set({ expiresAt, provenAt: now })
        .where(
          and(
            eq(verifications.id, verificationId),
            eq(verifications.isDecoy, false),
            gt(verifications.expiresAt, now),
            isNull(verifications.endedAt),
            isNull(verifications.provenAt),
          ),
        )
        .returning({ id: verifications.id })
    )[0]
  ) {
    return null;
  }

  return expiresAt;
}
