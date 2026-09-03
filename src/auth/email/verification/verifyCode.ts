import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@app/db";
import { getCurrentUser } from "@kenstack/auth/server/user";
import { ReturnedError } from "@kenstack/api";

import {
  endImpersonationBeforeVerificationMessage,
  getCurrentVerificationHistory,
  expiredCodeMessage,
  verificationEndedMessage,
  incorrectCodeMessage,
  signOutBeforeVerificationMessage,
  supersededCodeMessage,
} from "./internal/policy";
import {
  endVerification,
  loadVerificationsForUpdate,
  proveVerification,
  resolveCodeAttempt,
} from "./internal/repository";
import { challengeKeySchema, codeSchema } from "./schemas";
import { getVerificationKey, setVerificationCookie } from "./internal/cookie";
import { hashVerificationKey } from "./internal/crypto";

export async function verifyCode({
  challengeKey: unparsedChallengeKey,
  code: unparsedCode,
}: {
  challengeKey: string;
  code: string;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser?.impersonatedBy) {
    throw new ReturnedError(endImpersonationBeforeVerificationMessage, {
      status: 403,
    });
  }
  if (currentUser) {
    throw new ReturnedError(signOutBeforeVerificationMessage, { status: 409 });
  }

  const challengeKey = challengeKeySchema.parse(unparsedChallengeKey);
  const code = codeSchema.parse(unparsedCode);
  const verificationKey = await getVerificationKey();

  if (!verificationKey) {
    throw new ReturnedError(verificationEndedMessage, { status: 409 });
  }
  const verificationKeyHash = hashVerificationKey(verificationKey);

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${verificationKeyHash}))`,
    );
    const history = getCurrentVerificationHistory(
      await loadVerificationsForUpdate(tx, verificationKeyHash),
    );
    const current = history[0];
    const now = new Date();

    if (!current || current.challengeKey !== challengeKey || current.endedAt) {
      return { status: "ended" as const };
    }

    if (current.expiresAt <= now) {
      await endVerification(tx, current.id, now);
      return { status: "ended" as const };
    }

    if (current.provenAt) {
      return {
        email: current.email,
        expiresAt: current.expiresAt,
        status: "proven" as const,
        verificationId: current.id,
      };
    }

    const codeOutcome = await resolveCodeAttempt(tx, {
      code,
      current,
      previous: history.slice(1),
    });

    if (codeOutcome === "exhausted") {
      await endVerification(tx, current.id, now);
      return { status: "ended" as const };
    }
    if (codeOutcome !== "proven") {
      return { status: codeOutcome };
    }

    const expiresAt = await proveVerification(tx, {
      now,
      verificationId: current.id,
    });

    if (!expiresAt) {
      return { status: "ended" as const };
    }

    return {
      email: current.email,
      expiresAt,
      status: "proven" as const,
      verificationId: current.id,
    };
  });

  switch (outcome.status) {
    case "ended":
      throw new ReturnedError(verificationEndedMessage, { status: 409 });
    case "superseded":
      throw new ReturnedError(supersededCodeMessage, { status: 409 });
    case "expired":
      throw new ReturnedError(expiredCodeMessage, { status: 409 });
    case "incorrect":
      throw new ReturnedError(incorrectCodeMessage, { status: 400 });
    case "proven":
      break;
  }

  await setVerificationCookie(verificationKey, outcome.expiresAt);

  return {
    email: outcome.email,
    state: "proven" as const,
    verificationId: outcome.verificationId,
  };
}
