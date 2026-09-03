import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  commit: vi.fn(),
  claimQuota: vi.fn(),
  endVerification: vi.fn(),
  createVerification: vi.fn(),
  createSecrets: vi.fn(),
  createKey: vi.fn(),
  createFreshSecrets: vi.fn(),
  deleteExpired: vi.fn(),
  deleteVerification: vi.fn(),
  error: vi.fn(),
  getCurrentUser: vi.fn(),
  hashKey: vi.fn(),
  loadFrom: vi.fn(),
  loadVerification: vi.fn(),
  markVerificationDecoy: vi.fn(),
  sendEmail: vi.fn(),
  setCookie: vi.fn(),
  transaction: vi.fn(),
  waitUntil: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  lte: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));
vi.mock("@vercel/functions", () => ({ waitUntil: mocks.waitUntil }));
vi.mock("@kenstack/api", () => {
  class ReturnedError extends Error {
    status: number;

    constructor(message: string, { status = 400 }: { status?: number } = {}) {
      super(message);
      this.status = status;
    }
  }

  return {
    claimQuota: mocks.claimQuota,
    ReturnedError,
  };
});
vi.mock("@app/db", () => ({
  db: {
    delete: vi.fn(() => ({ where: mocks.deleteExpired })),
    transaction: mocks.transaction,
  },
}));
vi.mock("@app/email", () => ({
  attachments: [],
  loadEmailFrom: mocks.loadFrom,
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@kenstack/db/tables/verification", () => ({
  verifications: { expiresAt: {} },
}));
vi.mock("@kenstack/lib/errorReporter", () => ({
  reportError: mocks.error,
}));
vi.mock("@kenstack/lib/errorLog", () => ({ default: vi.fn() }));
vi.mock("@kenstack/lib/mailer", () => ({ default: mocks.sendEmail }));
vi.mock("@kenstack/lib/ip", () => ({ default: vi.fn() }));
vi.mock("@kenstack/auth/email/verification/internal/crypto", () => ({
  createChallengeSecrets: mocks.createSecrets,
  createVerificationKey: mocks.createKey,
  createFreshChallengeSecrets: mocks.createFreshSecrets,
  hashVerificationKey: mocks.hashKey,
}));
vi.mock("@kenstack/auth/email/verification/internal/repository", () => ({
  endVerification: mocks.endVerification,
  createVerification: mocks.createVerification,
  deleteVerification: mocks.deleteVerification,
  loadVerificationsForUpdate: mocks.loadVerification,
  markVerificationDecoy: mocks.markVerificationDecoy,
}));
vi.mock("@kenstack/auth/email/verification/internal/cookie", () => ({
  setVerificationCookie: mocks.setCookie,
  verificationCookie: "verification",
}));
import {
  sendCode,
  sendVerificationLink,
} from "@kenstack/auth/email/verification/sendCode";

const secrets = {
  challengeKey: "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55",
  code: "123456",
  codeHash: "code-hash",
  codeSalt: "code-salt",
  token: "token",
  tokenHash: "token-hash",
};

function request(cookie?: string) {
  return {
    cookies: { get: () => (cookie ? { value: cookie } : undefined) },
    url: "https://example.com/request",
  };
}

function createEmail() {
  return vi.fn().mockReturnValue({ html: "<p>Verify</p>", subject: "Verify" });
}

describe("sendCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T18:00:00.000Z"));
    vi.spyOn(Math, "random").mockReturnValue(1);
    mocks.getCurrentUser.mockResolvedValue(undefined);
    mocks.claimQuota.mockResolvedValue(null);
    mocks.hashKey.mockReturnValue("verification-key-hash");
    mocks.createSecrets.mockReturnValue(secrets);
    mocks.deleteExpired.mockResolvedValue([]);
    mocks.createKey.mockReturnValueOnce("new-verification");
    mocks.createVerification.mockResolvedValue({ id: 3 });
    mocks.loadFrom.mockResolvedValue("sender@example.com");
    mocks.sendEmail.mockResolvedValue({ status: "sent" });
    mocks.transaction.mockImplementation(async (callback) => {
      const result = await callback({ execute: vi.fn() });
      mocks.commit();
      return result;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("creates and delivers a new challenge through the site email callback", async () => {
    mocks.loadVerification.mockResolvedValue([]);
    const email = createEmail();

    await expect(
      sendCode(
        {
          email: "person@example.com",
          linkPath: "/verify",
          request: request() as never,
        },
        email,
      ),
    ).resolves.toMatchObject({
      challengeKey: secrets.challengeKey,
      email: "person@example.com",
    });
    expect(email).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "123456",
        email: "person@example.com",
      }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "new-verification",
      new Date("2026-08-17T18:15:00.000Z"),
    );
  });

  it("refuses a link path that leaves the site", async () => {
    mocks.loadVerification.mockResolvedValue([]);

    await expect(
      sendCode(
        {
          email: "person@example.com",
          linkPath: "//example.net/login",
          request: request() as never,
        },
        createEmail(),
      ),
    ).rejects.toThrow("Verification link must stay on this site");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("binds a recovery link to the requesting browser", async () => {
    mocks.loadVerification.mockResolvedValue([]);
    const email = createEmail();

    await sendVerificationLink(
      {
        email: "person@example.com",
        linkPath: "/login?returnTo=%2Freset-password",
        request: request() as unknown as Parameters<
          typeof sendVerificationLink
        >[0]["request"],
      },
      email,
    );

    expect(mocks.createSecrets).toHaveBeenCalledWith();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "new-verification",
      new Date("2026-08-17T18:15:00.000Z"),
    );
  });

  it("creates a decoy recovery challenge through the regular lifecycle", async () => {
    mocks.loadVerification.mockResolvedValue([]);
    const email = createEmail();

    await sendVerificationLink(
      {
        email: "missing@example.com",
        isDecoy: true,
        linkPath: "/login?returnTo=%2Freset-password",
        request: request() as unknown as Parameters<
          typeof sendVerificationLink
        >[0]["request"],
      },
      email,
    );

    expect(mocks.createVerification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ isDecoy: true }),
    );
    expect(mocks.claimQuota).toHaveBeenCalledWith(
      "verification",
      { email: "missing@example.com" },
      expect.anything(),
    );
    expect(email).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "new-verification",
      new Date("2026-08-17T18:15:00.000Z"),
    );
  });

  it("keeps a failed recovery delivery as a decoy challenge", async () => {
    mocks.loadVerification.mockResolvedValue([]);
    mocks.sendEmail.mockResolvedValue({ status: "operational-failure" });

    await expect(
      sendVerificationLink(
        {
          email: "person@example.com",
          linkPath: "/login?returnTo=%2Freset-password",
          request: request() as unknown as Parameters<
            typeof sendVerificationLink
          >[0]["request"],
        },
        createEmail(),
      ),
    ).resolves.toBeUndefined();

    expect(mocks.markVerificationDecoy).toHaveBeenCalledWith(
      expect.anything(),
      3,
    );
    expect(mocks.deleteVerification).not.toHaveBeenCalled();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "new-verification",
      new Date("2026-08-17T18:15:00.000Z"),
    );
  });

  it("keeps an unexpected recovery delivery failure from reopening the oracle", async () => {
    mocks.loadVerification.mockResolvedValue([]);
    const failure = new Error("Transport disconnected");
    mocks.sendEmail.mockRejectedValue(failure);

    await expect(
      sendVerificationLink(
        {
          email: "person@example.com",
          linkPath: "/login?returnTo=%2Freset-password",
          request: request() as unknown as Parameters<
            typeof sendVerificationLink
          >[0]["request"],
        },
        createEmail(),
      ),
    ).resolves.toBeUndefined();

    expect(mocks.error).toHaveBeenCalledWith(failure, {
      source: "auth.verification.sendVerification",
    });
    expect(mocks.markVerificationDecoy).toHaveBeenCalledWith(
      expect.anything(),
      3,
    );
    expect(mocks.deleteVerification).not.toHaveBeenCalled();
    expect(mocks.setCookie).toHaveBeenCalledOnce();
  });

  it("samples cleanup for verification rows expired more than a day ago", async () => {
    vi.mocked(Math.random).mockReturnValue(0);
    mocks.loadVerification.mockResolvedValue([]);

    await sendCode(
      {
        email: "person@example.com",
        linkPath: "/verify",
        request: request() as never,
      },
      createEmail(),
    );

    expect(mocks.deleteExpired).toHaveBeenCalledOnce();
    expect(mocks.waitUntil).toHaveBeenCalledOnce();
  });

  it("removes a newly prepared request when delivery fails", async () => {
    mocks.loadVerification.mockResolvedValue([]);
    mocks.sendEmail.mockResolvedValue({ status: "recipient-rejected" });

    await expect(
      sendCode(
        {
          email: "person@example.com",
          linkPath: "/verify",
          request: request() as never,
        },
        createEmail(),
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(mocks.deleteVerification).toHaveBeenCalledWith(expect.anything(), 3);
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("rejects quota before replacing the current challenge", async () => {
    mocks.claimQuota.mockResolvedValue({
      message: "Too many requests. Please try again later.",
      subject: "email",
    });
    const email = createEmail();

    await expect(
      sendCode(
        {
          email: "new@example.com",
          linkPath: "/verify",
          request: request("current-verification") as never,
        },
        email,
      ),
    ).rejects.toMatchObject({
      message: "Too many requests. Please try again later.",
      status: 429,
    });
    expect(mocks.claimQuota).toHaveBeenCalledWith(
      "verification",
      { email: "new@example.com" },
      expect.anything(),
    );
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.endVerification).not.toHaveBeenCalled();
    expect(mocks.createVerification).not.toHaveBeenCalled();
    expect(mocks.deleteVerification).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("claims no quota for a resend inside the cooldown", async () => {
    mocks.loadVerification.mockResolvedValue([
      {
        challengeKey: "current-challenge",
        codeHash: "old-hash",
        codeSalt: "old-salt",
        createdAt: new Date("2026-08-17T17:59:55.000Z"),
        email: "person@example.com",
        endedAt: null,
        expiresAt: new Date("2026-08-17T18:10:00.000Z"),
        failedAttempts: 0,
        id: 1,
        provenAt: null,
      },
    ]);

    await expect(
      sendCode(
        {
          challengeKey: "current-challenge",
          email: "person@example.com",
          linkPath: "/verify",
          request: request("current-verification") as never,
        },
        createEmail(),
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(mocks.claimQuota).not.toHaveBeenCalled();
    expect(mocks.createVerification).not.toHaveBeenCalled();
  });

  it("removes a failed resend so the prior challenge remains current", async () => {
    const current = {
      challengeKey: "current-challenge",
      codeHash: "old-hash",
      codeSalt: "old-salt",
      createdAt: new Date("2026-08-17T17:59:00.000Z"),
      email: "person@example.com",
      endedAt: null,
      expiresAt: new Date("2026-08-17T18:10:00.000Z"),
      failedAttempts: 1,
      id: 1,
      provenAt: null,
    };
    mocks.loadVerification.mockResolvedValue([current]);
    mocks.createFreshSecrets.mockReturnValue(secrets);
    mocks.sendEmail.mockResolvedValue({ status: "operational-failure" });

    await expect(
      sendCode(
        {
          challengeKey: "current-challenge",
          email: "person@example.com",
          linkPath: "/verify",
          request: request("current-verification") as never,
        },
        createEmail(),
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(mocks.createFreshSecrets).toHaveBeenCalledWith([current]);
    expect(mocks.createVerification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        failedAttempts: 1,
        verificationKeyHash: "verification-key-hash",
      }),
    );
    expect(mocks.deleteVerification).toHaveBeenCalledWith(expect.anything(), 3);
  });

  it("does not revive an older challenge when a replacement email fails", async () => {
    const current = {
      challengeKey: "current-challenge",
      codeHash: "old-hash",
      codeSalt: "old-salt",
      createdAt: new Date("2026-08-17T17:59:00.000Z"),
      email: "old@example.com",
      endedAt: null,
      expiresAt: new Date("2026-08-17T18:10:00.000Z"),
      failedAttempts: 0,
      id: 1,
      provenAt: null,
    };
    mocks.loadVerification.mockResolvedValue([current]);
    mocks.sendEmail.mockResolvedValue({ status: "operational-failure" });

    await expect(
      sendCode(
        {
          email: "new@example.com",
          linkPath: "/verify",
          request: request("current-verification") as never,
        },
        createEmail(),
      ),
    ).rejects.toMatchObject({ status: 503 });

    expect(mocks.endVerification).toHaveBeenCalledWith(
      expect.anything(),
      current.id,
      expect.any(Date),
    );
    expect(mocks.createKey).not.toHaveBeenCalled();
    expect(mocks.createVerification).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ verificationKeyHash: "verification-key-hash" }),
    );
    expect(mocks.deleteVerification).toHaveBeenCalledWith(expect.anything(), 3);
  });

  it("commits the ended state when the send limit is reached", async () => {
    const history = Array.from({ length: 3 }, (_, index) => ({
      challengeKey:
        index === 0
          ? "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55"
          : `previous-${index}`,
      codeHash: `hash-${index}`,
      codeSalt: `salt-${index}`,
      createdAt: new Date(`2026-08-17T17:5${9 - index}:00.000Z`),
      email: "person@example.com",
      endedAt: null,
      expiresAt: new Date("2026-08-17T18:10:00.000Z"),
      failedAttempts: 0,
      id: 3 - index,
      provenAt: null,
    }));
    mocks.loadVerification.mockResolvedValue(history);

    await expect(
      sendCode(
        {
          challengeKey: history[0].challengeKey,
          email: "person@example.com",
          linkPath: "/verify",
          request: request("current-verification") as never,
        },
        createEmail(),
      ),
    ).rejects.toMatchObject({ status: 409 });

    expect(mocks.endVerification).toHaveBeenCalledWith(
      expect.anything(),
      history[0].id,
      expect.any(Date),
    );
    expect(mocks.commit).toHaveBeenCalledOnce();
    expect(mocks.createVerification).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
