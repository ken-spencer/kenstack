import { describe, expect, it } from "vitest";

import {
  calculateChallengeExpiresAt,
  calculateProofExpiresAt,
  getCurrentVerificationHistory,
  hasChallengeReachedSendLimit,
  isChallengeInResendCooldown,
  resolveCodeOutcome,
} from "@kenstack/auth/email/verification/internal/policy";

describe("email challenge expiry", () => {
  it("uses the shared challenge duration when verification lasts longer", () => {
    const now = new Date("2026-07-28T18:00:00.000Z");
    const verificationExpiresAt = new Date("2026-07-28T19:00:00.000Z");

    expect(calculateChallengeExpiresAt({ verificationExpiresAt, now })).toEqual(
      new Date("2026-07-28T18:15:00.000Z"),
    );
  });

  it("does not outlive the verification", () => {
    const now = new Date("2026-07-28T18:00:00.000Z");
    const verificationExpiresAt = new Date("2026-07-28T18:05:00.000Z");

    expect(calculateChallengeExpiresAt({ verificationExpiresAt, now })).toEqual(
      verificationExpiresAt,
    );
  });
});

describe("verified email proof expiry", () => {
  it("starts a fresh one-hour proof window when verification succeeds", () => {
    const now = new Date("2026-07-28T18:00:00.000Z");

    expect(calculateProofExpiresAt(now)).toEqual(
      new Date("2026-07-28T19:00:00.000Z"),
    );
  });
});

describe("email challenge resend limits", () => {
  const now = new Date("2026-07-28T18:00:00.000Z");

  it("enforces the send limit on the third delivery", () => {
    expect(hasChallengeReachedSendLimit(2)).toBe(false);
    expect(hasChallengeReachedSendLimit(3)).toBe(true);
  });

  it("allows another send once the thirty-second cooldown has elapsed", () => {
    expect(
      isChallengeInResendCooldown({
        sentAt: new Date(now.getTime() - 29_999),
        now,
      }),
    ).toBe(true);
    expect(
      isChallengeInResendCooldown({
        sentAt: new Date(now.getTime() - 30_000),
        now,
      }),
    ).toBe(false);
  });

  it("counts only rows after the last ended verification", () => {
    const current = { endedAt: null, id: 3 };
    const previousSend = { endedAt: null, id: 2 };
    const previousVerification = { endedAt: now, id: 1 };

    expect(
      getCurrentVerificationHistory([
        current,
        previousSend,
        previousVerification,
      ]),
    ).toEqual([current, previousSend]);
  });
});

describe("email verification code outcomes", () => {
  it("accepts the current code without consuming an attempt", () => {
    expect(
      resolveCodeOutcome({
        failedAttempts: 2,
        matchesCurrent: true,
        matchesSuperseded: false,
      }),
    ).toEqual({ status: "proven" });
  });

  it("reports a superseded code separately from an incorrect code", () => {
    expect(
      resolveCodeOutcome({
        failedAttempts: 2,
        matchesCurrent: false,
        matchesSuperseded: true,
      }),
    ).toEqual({ status: "superseded" });
  });

  it("counts an incorrect code while attempts remain", () => {
    expect(
      resolveCodeOutcome({
        failedAttempts: 2,
        matchesCurrent: false,
        matchesSuperseded: false,
      }),
    ).toEqual({ status: "incorrect", failedAttempts: 3 });
  });

  it("exhausts the challenge on the final allowed incorrect attempt", () => {
    expect(
      resolveCodeOutcome({
        failedAttempts: 4,
        matchesCurrent: false,
        matchesSuperseded: false,
      }),
    ).toEqual({ status: "exhausted" });
  });

  it("leaves an exhausted challenge exhausted", () => {
    expect(
      resolveCodeOutcome({
        failedAttempts: 5,
        matchesCurrent: true,
        matchesSuperseded: false,
      }),
    ).toEqual({ status: "exhausted" });
  });
});
