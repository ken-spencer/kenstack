export const verificationEndedMessage =
  "That verification request has ended. Enter your email to start again.";
export const resendCooldownMessage =
  "Please wait a moment before resending the email.";
export const supersededCodeMessage =
  "That code has been replaced. Enter the code from the newest email we sent.";
export const expiredCodeMessage =
  "That code is from an earlier request and no longer works. Enter the code from the newest email, or resend it.";
export const incorrectCodeMessage =
  "That code isn’t right or has expired. Enter the code from the newest email, or resend it.";
export const endImpersonationBeforeVerificationMessage =
  "End impersonation before verifying an email address.";
export const signOutBeforeVerificationMessage =
  "Sign out before verifying an email address.";

type CodeOutcome =
  | { status: "exhausted" }
  | { status: "incorrect"; failedAttempts: number }
  | { status: "superseded" }
  | { status: "proven" };

export function calculateProofExpiresAt(now: Date) {
  return new Date(now.getTime() + 60 * 60 * 1000);
}

export function calculateChallengeExpiresAt({
  verificationExpiresAt,
  now,
}: {
  verificationExpiresAt?: Date;
  now: Date;
}) {
  const expiry = now.getTime() + 15 * 60 * 1000;

  return new Date(
    verificationExpiresAt
      ? Math.min(expiry, verificationExpiresAt.getTime())
      : expiry,
  );
}

function hasChallengeReachedAttemptLimit(failedAttempts: number) {
  return failedAttempts >= 5;
}

export function hasChallengeReachedSendLimit(sentCount: number) {
  return sentCount >= 3;
}

export function getCurrentVerificationHistory<
  TRecord extends { endedAt: Date | null },
>(history: readonly TRecord[]) {
  const previousVerificationIndex = history.findIndex(
    ({ endedAt }) => endedAt !== null,
  );

  return previousVerificationIndex === -1
    ? history
    : history.slice(0, previousVerificationIndex);
}

export function isChallengeInResendCooldown({
  sentAt,
  now,
}: {
  sentAt: Date;
  now: Date;
}) {
  return now.getTime() - sentAt.getTime() < 30 * 1000;
}

export function resolveCodeOutcome({
  failedAttempts,
  matchesCurrent,
  matchesSuperseded,
}: {
  failedAttempts: number;
  matchesCurrent: boolean;
  matchesSuperseded: boolean;
}): CodeOutcome {
  if (hasChallengeReachedAttemptLimit(failedAttempts)) {
    return { status: "exhausted" };
  }
  if (matchesCurrent) {
    return { status: "proven" };
  }
  if (matchesSuperseded) {
    return { status: "superseded" };
  }

  const nextFailedAttempts = failedAttempts + 1;
  if (hasChallengeReachedAttemptLimit(nextFailedAttempts)) {
    return { status: "exhausted" };
  }

  return { status: "incorrect", failedAttempts: nextFailedAttempts };
}
