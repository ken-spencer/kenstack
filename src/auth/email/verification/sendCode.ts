import "server-only";

import { lte, sql } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { waitUntil } from "@vercel/functions";

import { attachments as defaultAttachments, loadEmailFrom } from "@app/email";
import { db } from "@app/db";
import { claimQuota, ReturnedError } from "@kenstack/api";
import { verifications } from "@kenstack/db/tables/verification";
import errorLog from "@kenstack/lib/errorLog";
import getIp from "@kenstack/lib/ip";
import { reportError } from "@kenstack/lib/errorReporter";
import mailer, {
  type Attachment,
  type EmailAddress,
} from "@kenstack/lib/mailer";

import {
  createChallengeSecrets,
  createFreshChallengeSecrets,
  createVerificationKey,
  hashVerificationKey,
} from "./internal/crypto";
import {
  calculateChallengeExpiresAt,
  getCurrentVerificationHistory,
  hasChallengeReachedSendLimit,
  isChallengeInResendCooldown,
  resendCooldownMessage,
  selectBoundHistory,
  verificationEndedCode,
  verificationReplacedMessage,
  verificationSendLimitMessage,
} from "./internal/policy";
import {
  type VerificationBinding,
  endVerification,
  createVerification,
  deleteVerification,
  loadVerificationsForUpdate,
  markVerificationDecoy,
} from "./internal/repository";
import siteOrigin from "@kenstack/lib/siteOrigin";
import { emailSchema } from "./schemas";
import { setVerificationCookie, verificationCookie } from "./internal/cookie";

export type CreateVerificationEmail = (input: {
  code: string;
  email: string;
  expiresInMinutes: number;
  url: string;
}) =>
  | Promise<{ html: string; subject: string }>
  | { html: string; subject: string };

export async function sendCode(
  {
    challengeKey,
    email: unparsedEmail,
    isDecoy = false,
    kind = "login",
    linkPath,
    request,
    userId = null,
  }: Partial<VerificationBinding> & {
    challengeKey?: string;
    email: string;
    // A decoy keeps the code screen identical for an address the caller
    // must not confirm or deny; no code is sent and none can prove it.
    isDecoy?: boolean;
    linkPath: `/${string}`;
    request: NextRequest;
  },
  createVerificationEmail: CreateVerificationEmail,
) {
  const challenge = await sendVerification(
    {
      challengeKey,
      concealDeliveryFailure: false,
      email: unparsedEmail,
      isDecoy,
      kind,
      linkPath,
      request,
      userId,
    },
    createVerificationEmail,
  );

  return { challengeKey: challenge.challengeKey, email: challenge.email };
}

export async function sendVerificationLink(
  {
    attachments,
    email,
    from,
    isDecoy = false,
    linkPath,
    request,
  }: {
    attachments?: Attachment[];
    email: string;
    from?: EmailAddress;
    isDecoy?: boolean;
    linkPath: `/${string}`;
    request: NextRequest;
  },
  createVerificationEmail: CreateVerificationEmail,
) {
  await sendVerification(
    {
      attachments,
      concealDeliveryFailure: true,
      email,
      from,
      isDecoy,
      linkPath,
      request,
    },
    createVerificationEmail,
  );
}

async function sendVerification(
  {
    attachments = defaultAttachments,
    challengeKey,
    concealDeliveryFailure,
    email: unparsedEmail,
    from: configuredFrom,
    isDecoy,
    kind = "login",
    linkPath,
    request,
    userId = null,
  }: Partial<VerificationBinding> & {
    attachments?: Attachment[];
    challengeKey?: string;
    concealDeliveryFailure: boolean;
    email: string;
    from?: EmailAddress;
    isDecoy: boolean;
    linkPath: `/${string}`;
    request: NextRequest;
  },
  createVerificationEmail: CreateVerificationEmail,
) {
  // The browser's verification key continues an existing chain; a new one
  // starts a chain and the cookie is set once the challenge exists.
  const verificationKey =
    request.cookies.get(verificationCookie)?.value ?? createVerificationKey();

  if (Math.random() < 0.01) {
    waitUntil(
      db
        .delete(verifications)
        .where(
          lte(
            verifications.expiresAt,
            new Date(Date.now() - 24 * 60 * 60 * 1000),
          ),
        ),
    );
  }

  const email = emailSchema.parse(unparsedEmail);
  // The link carries the token, so a misconfigured path must never leave the site.
  const origin = await siteOrigin(request);
  const url = new URL(linkPath, origin);
  if (url.origin !== origin) {
    throw new Error("Verification link must stay on this site");
  }
  const verificationKeyHash = hashVerificationKey(verificationKey);
  let secrets = createChallengeSecrets();

  const prepared = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${verificationKeyHash}))`,
    );
    const now = new Date();
    const history = selectBoundHistory(
      await loadVerificationsForUpdate(tx, verificationKeyHash),
      { kind, userId },
    );
    const currentHistory = getCurrentVerificationHistory(history);
    const current = history[0];
    const isActive = current && !current.endedAt && current.expiresAt > now;

    if (isActive && current.provenAt && current.email === email) {
      throw new ReturnedError("That email address is already verified.", {
        status: 409,
      });
    }

    const isResending =
      isActive && !current.provenAt && current.email === email;

    if (
      challengeKey &&
      (!isResending || current.challengeKey !== challengeKey)
    ) {
      throw new ReturnedError(verificationReplacedMessage, {
        code: verificationEndedCode,
        status: 409,
      });
    }

    if (isResending) {
      if (
        isChallengeInResendCooldown({
          sentAt: current.createdAt,
          now,
        })
      ) {
        throw new ReturnedError(resendCooldownMessage, { status: 429 });
      }

      if (hasChallengeReachedSendLimit(currentHistory.length)) {
        await endVerification(tx, current.id, now);
        return { status: "ended" as const };
      }

      secrets = createFreshChallengeSecrets(currentHistory);
    }

    // Claimed after every refusal above so a rejected resend spends nothing.
    const exceeded = await claimQuota(
      "verification",
      { email, ip: await getIp(request) },
      tx,
    );
    if (exceeded) {
      throw new ReturnedError(exceeded.message, { status: 429 });
    }

    const expiresAt = calculateChallengeExpiresAt({
      verificationExpiresAt: isResending ? current.expiresAt : undefined,
      now,
    });
    if (!isResending && current) {
      await endVerification(tx, current.id, now);
    }

    return {
      challengeKey: secrets.challengeKey,
      expiresAt,
      status: "prepared" as const,
      verificationId: (
        await createVerification(tx, {
          email,
          expiresAt,
          failedAttempts: isResending ? current.failedAttempts : 0,
          isDecoy,
          kind,
          userId,
          verificationKeyHash,
          secrets,
        })
      ).id,
    };
  });

  if (prepared.status === "ended") {
    throw new ReturnedError(verificationSendLimitMessage, {
      code: verificationEndedCode,
      status: 409,
    });
  }

  try {
    if (!isDecoy) {
      const from = configuredFrom ?? (await loadEmailFrom());
      if (!from) {
        await errorLog({
          message: "Verification email sender is not configured.",
          name: "verification-email-sender-not-configured",
        });
        throw new ReturnedError("Verification email is not configured yet.", {
          status: 503,
        });
      }

      url.searchParams.set("token", secrets.token);
      const message = await createVerificationEmail({
        code: secrets.code,
        email,
        expiresInMinutes: Math.max(
          1,
          Math.ceil((prepared.expiresAt.getTime() - Date.now()) / 60_000),
        ),
        url: url.toString(),
      });
      const delivery = await mailer({
        attachments,
        from,
        html: message.html,
        subject: message.subject,
        to: email,
      });

      if (delivery.status === "recipient-rejected") {
        throw new ReturnedError(
          "That email address could not receive the verification email. Check it and try again.",
          { status: 400 },
        );
      }
      if (delivery.status !== "sent") {
        throw new ReturnedError(
          "We could not send the verification email. Try again in a moment.",
          { status: 503 },
        );
      }
    }
  } catch (error) {
    if (concealDeliveryFailure) {
      if (!(error instanceof ReturnedError)) {
        await reportError(error, {
          source: "auth.verification.sendVerification",
        });
      }
      await db.transaction((tx) =>
        markVerificationDecoy(tx, prepared.verificationId),
      );
    } else {
      await db.transaction((tx) =>
        deleteVerification(tx, prepared.verificationId),
      );
      throw error;
    }
  }

  await setVerificationCookie(verificationKey, prepared.expiresAt);
  return { challengeKey: prepared.challengeKey, email };
}
