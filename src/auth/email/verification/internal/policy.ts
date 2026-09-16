const challengeLifetimeMinutes = 15;
const challengeSendLimit = 3;

// Every message below travels with this code so a code screen can return to
// the email form instead of waiting on a request that no longer exists. Each
// one names the reason, since the visitor cannot see it otherwise.
export const verificationEndedCode = "ended";
export const verificationMissingMessage =
  "This browser has no open request for that email. It may have been cleared or started somewhere else. Enter your email to start again.";
export const verificationReplacedMessage =
  "That request was replaced or cancelled. Enter your email to start again.";
export const verificationExpiredMessage = `That request expired after ${challengeLifetimeMinutes} minutes. Enter your email to get a new code.`;
export const verificationAttemptsMessage =
  "Too many incorrect codes. Enter your email to get a new one.";
export const verificationSendLimitMessage = `That email has already been sent ${challengeSendLimit} times. Enter your email to start again.`;
export const resendCooldownMessage =
  "Please wait a moment before resending the email.";
export const supersededCodeMessage =
  "That code has been replaced. Enter the code from the newest email we sent.";
export const expiredCodeMessage =
  "That code is from an earlier request and no longer works. Enter the code from the newest email, or resend it.";
export const incorrectCodeMessage =
  "That code isn’t right or has expired. Enter the code from the newest email, or resend it.";

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
  const expiry = now.getTime() + challengeLifetimeMinutes * 60 * 1000;

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
  return sentCount >= challengeSendLimit;
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

// A browser's chain holds every kind of request it made. Each kind, and each
// account for an email change, is read and replaced as its own stack, so a
// login code sent while a change is pending leaves that change in place.
export function selectBoundHistory<
  TRecord extends { kind: string; userId: number | null },
>(
  history: readonly TRecord[],
  { kind, userId }: { kind: string; userId: number | null },
) {
  return history.filter(
    (record) => record.kind === kind && record.userId === userId,
  );
}
