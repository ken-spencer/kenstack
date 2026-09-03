import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  endVerification: vi.fn(),
  getCurrentUser: vi.fn(),
  getKey: vi.fn(),
  loadVerification: vi.fn(),
  prove: vi.fn(),
  resolveAttempt: vi.fn(),
  setCookie: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/api", () => {
  class ReturnedError extends Error {
    status: number;

    constructor(message: string, { status = 400 }: { status?: number } = {}) {
      super(message);
      this.status = status;
    }
  }

  return { ReturnedError };
});
vi.mock("@app/db", () => ({
  db: { transaction: mocks.transaction },
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@kenstack/auth/email/verification/internal/repository", () => ({
  endVerification: mocks.endVerification,
  loadVerificationsForUpdate: mocks.loadVerification,
  proveVerification: mocks.prove,
  resolveCodeAttempt: mocks.resolveAttempt,
}));
vi.mock("@kenstack/auth/email/verification/internal/cookie", () => ({
  getVerificationKey: mocks.getKey,
  setVerificationCookie: mocks.setCookie,
}));
import { verifyCode } from "@kenstack/auth/email/verification/verifyCode";

const activeChallengeKey = "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55";
const staleChallengeKey = "c6ac1820-e59d-4114-8df7-683985b28768";
const now = new Date("2026-08-17T18:00:00.000Z");
const proofExpiresAt = new Date("2026-08-17T19:00:00.000Z");

function activeRecord() {
  return {
    challengeKey: activeChallengeKey,
    codeHash: "hash",
    codeSalt: "salt",
    createdAt: new Date("2030-01-01T00:00:00.000Z"),
    endedAt: null,
    email: "person@example.com",
    expiresAt: new Date("2030-01-01T00:15:00.000Z"),
    failedAttempts: 0,
    id: 3,
    provenAt: null,
  };
}

describe("verifyCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.getCurrentUser.mockResolvedValue(undefined);
    mocks.getKey.mockResolvedValue("verification-key");
    mocks.transaction.mockImplementation((callback) =>
      callback({ execute: vi.fn() }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not close the live request for a stale challenge key", async () => {
    mocks.loadVerification.mockResolvedValue([activeRecord()]);

    await expect(
      verifyCode({ challengeKey: staleChallengeKey, code: "123456" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.endVerification).not.toHaveBeenCalled();
  });

  it("closes a request only when its verification deadline has passed", async () => {
    mocks.loadVerification.mockResolvedValue([
      {
        ...activeRecord(),
        expiresAt: new Date(now.getTime() - 1),
      },
    ]);

    await expect(
      verifyCode({ challengeKey: activeChallengeKey, code: "123456" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.endVerification).toHaveBeenCalledWith(
      expect.anything(),
      3,
      now,
    );
  });

  it("extends the browser cookie to the successful proof deadline", async () => {
    mocks.loadVerification.mockResolvedValue([activeRecord()]);
    mocks.resolveAttempt.mockResolvedValue("proven");
    mocks.prove.mockResolvedValue(proofExpiresAt);

    await expect(
      verifyCode({ challengeKey: activeChallengeKey, code: "123456" }),
    ).resolves.toEqual({
      email: "person@example.com",
      state: "proven",
      verificationId: 3,
    });
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "verification-key",
      proofExpiresAt,
    );
  });

  it("keeps an existing proof after the original challenge expires", async () => {
    mocks.loadVerification.mockResolvedValue([
      {
        ...activeRecord(),
        expiresAt: proofExpiresAt,
        provenAt: new Date(now.getTime() - 60_000),
      },
    ]);

    await expect(
      verifyCode({ challengeKey: activeChallengeKey, code: "123456" }),
    ).resolves.toEqual({
      email: "person@example.com",
      state: "proven",
      verificationId: 3,
    });
    expect(mocks.endVerification).not.toHaveBeenCalled();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "verification-key",
      proofExpiresAt,
    );
  });
});
