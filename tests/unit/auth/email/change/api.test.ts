import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  checkLink: vi.fn(),
  consume: vi.fn(),
  endVerification: vi.fn(),
  loadFreshPublicAuthState: vi.fn(),
  loadPublicAuthState: vi.fn(),
  loadVerifications: vi.fn(),
  mailer: vi.fn(),
  render: vi.fn(),
  reportError: vi.fn(),
  revalidateTag: vi.fn(),
  sendCode: vi.fn(),
  findUser: vi.fn(),
  getCurrentSession: vi.fn(),
  login: vi.fn(),
  deleteWhere: vi.fn(),
  transaction: vi.fn(),
  updateWhere: vi.fn(),
  verifyCode: vi.fn(),
  verifyLink: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("react-email", () => ({ render: mocks.render }));
vi.mock("@app/db", () => ({
  db: {
    query: { users: { findFirst: mocks.findUser } },
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [{ challengeKey }] }),
      }),
    }),
    transaction: mocks.transaction,
  },
}));
vi.mock("@app/email", () => ({ attachments: [] }));
vi.mock("@app/modules", () => ({
  modules: { users: { admin: { table: { email: "email", id: "id" } } } },
}));
vi.mock("@kenstack/api", () => {
  class ReturnedError extends Error {
    code?: string;
    status: number;

    constructor(
      message: string,
      { code, status = 400 }: { code?: string; status?: number } = {},
    ) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }

  return {
    pipelineStage: (_options: unknown, callback: unknown) => callback,
    ReturnedError,
  };
});
vi.mock("@kenstack/auth/server/state", () => ({
  loadFreshPublicAuthState: mocks.loadFreshPublicAuthState,
  loadPublicAuthState: mocks.loadPublicAuthState,
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getFreshCurrentSession: mocks.getCurrentSession,
  userSessionsCacheTag: (userId: number) => `auth-user-sessions:${userId}`,
}));
vi.mock("@kenstack/auth/server/auth", () => ({ login: mocks.login }));
vi.mock("@kenstack/db/tables/sessions", () => ({
  sessions: { userId: "sessionUserId" },
}));
vi.mock("@kenstack/db/tables/verification", () => ({
  verifications: {},
}));
vi.mock("@kenstack/lib/errorReporter", () => ({
  reportError: mocks.reportError,
}));
vi.mock("@kenstack/lib/mailer", () => ({ default: mocks.mailer }));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("@kenstack/auth/email/verification/Email", () => ({
  createVerificationEmail: vi.fn(),
}));
vi.mock("@kenstack/auth/email/verification/internal/cookie", () => ({}));
vi.mock("@kenstack/auth/email/verification/internal/crypto", () => ({
  hashVerificationKey: (key: string) => `hash:${key}`,
}));
vi.mock("@kenstack/auth/email/verification/internal/repository", () => ({
  consumeVerification: mocks.consume,
  endVerification: mocks.endVerification,
  loadVerificationsForUpdate: mocks.loadVerifications,
}));
vi.mock("@kenstack/auth/email/verification/sendCode", () => ({
  sendCode: mocks.sendCode,
}));
vi.mock("@kenstack/auth/email/verification/verifyCode", () => ({
  verifyCode: mocks.verifyCode,
}));
vi.mock("@kenstack/auth/email/verification/verifyLink", () => ({
  checkLink: mocks.checkLink,
  verifyLink: mocks.verifyLink,
}));
vi.mock("@kenstack/auth/email/change/NoticeEmail", () => ({
  default: () => null,
}));

import { createEmailChange } from "@kenstack/auth/email/change/api";
import { verificationEndedCode } from "@kenstack/auth/email/verification/internal/policy";

const challengeKey = "6f0f6dfa-7e5a-4be8-a0d5-0f1c2ff05c55";
type StageContext = Parameters<
  ReturnType<typeof createEmailChange>["request"]
>[0];

function context(data: Record<string, unknown>): StageContext {
  return {
    data,
    request: new Request("https://example.com/api/auth", {
      headers: { host: "example.com", "x-forwarded-proto": "https" },
    }),
    response: {
      error: vi.fn((value) => value),
      headers: new Headers(),
      success: vi.fn((value) => value),
    },
    user: { email: "Old@Example.com", id: 12 },
  } as unknown as StageContext;
}

const signedInState = {
  email: "old@example.com",
  state: "authenticated",
  userId: 12,
};

function transactionWith(tx: Record<string, unknown>) {
  mocks.transaction.mockImplementation((callback) => callback(tx));
}

beforeEach(() => {
  mocks.getCurrentSession.mockResolvedValue({
    createdAt: new Date(),
    authorizedUntil: new Date(new Date().getTime() + 600_000),
    expiresAt: new Date(Date.now() + 86400_000),
    impersonatedBy: null,
    provider: "email",
    userId: 12,
  });
});

describe("email change request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUser.mockResolvedValue(undefined);
    mocks.loadPublicAuthState.mockResolvedValue(signedInState);
    mocks.mailer.mockResolvedValue({ status: "sent" });
    mocks.render.mockResolvedValue("<p>Notice</p>");
    mocks.sendCode.mockResolvedValue({
      challengeKey,
      email: "new@example.com",
    });
  });

  it("refuses the address the user is already signed in as", async () => {
    await expect(
      createEmailChange({ linkPath: "/profile" }).request(
        context({ email: "old@example.com", userId: 12 }),
      ),
    ).resolves.toMatchObject({
      fieldErrors: { email: expect.any(String) },
    });
    expect(mocks.sendCode).not.toHaveBeenCalled();
    expect(mocks.mailer).not.toHaveBeenCalled();
  });

  it("sends the code to the new address and a cancellable notice to the old one", async () => {
    await expect(
      createEmailChange({ linkPath: "/profile" }).request(
        context({ email: "new@example.com", userId: 12 }),
      ),
    ).resolves.toEqual({
      authState: signedInState,
      challengeKey,
      email: "new@example.com",
    });
    expect(mocks.sendCode.mock.lastCall?.[0]).toMatchObject({
      email: "new@example.com",
      isDecoy: false,
      linkPath: "/profile",
    });
    expect(mocks.mailer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "Old@Example.com",
      }),
    );
    expect(mocks.render.mock.lastCall?.[0].props).toEqual({
      cancelUrl: `https://example.com/profile?cancelEmailChange=${challengeKey}`,
      newEmail: "new@example.com",
    });
  });

  it("gives an address that already has an account a decoy code screen and tells that address", async () => {
    mocks.findUser.mockResolvedValue({ id: 5 });

    await expect(
      createEmailChange({ linkPath: "/profile" }).request(
        context({ email: "new@example.com", userId: 12 }),
      ),
    ).resolves.toEqual({
      authState: signedInState,
      challengeKey,
      email: "new@example.com",
    });
    expect(mocks.sendCode.mock.lastCall?.[0]).toMatchObject({
      email: "new@example.com",
      isDecoy: true,
    });
    expect(mocks.mailer).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "new@example.com",
      }),
    );
    expect(mocks.mailer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "Old@Example.com" }),
    );
  });

  it("continues past a failed notice delivery without the reporter", async () => {
    mocks.mailer.mockResolvedValue({ status: "operational-failure" });

    await expect(
      createEmailChange({ linkPath: "/profile" }).request(
        context({ email: "new@example.com", userId: 12 }),
      ),
    ).resolves.toMatchObject({ challengeKey });
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("reports an unexpected notice failure without blocking the change", async () => {
    mocks.mailer.mockRejectedValue(new Error("render failed"));

    await expect(
      createEmailChange({ linkPath: "/profile" }).request(
        context({ email: "new@example.com", userId: 12 }),
      ),
    ).resolves.toMatchObject({ challengeKey });
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });

  it("does not repeat the notice on a resend", async () => {
    await createEmailChange({ linkPath: "/profile" }).request(
      context({ challengeKey, email: "new@example.com", userId: 12 }),
    );

    expect(mocks.sendCode.mock.lastCall?.[0]).toMatchObject({ challengeKey });
    expect(mocks.mailer).not.toHaveBeenCalled();
  });

  it.each([
    {
      createdAt: new Date(0),
      authorizedUntil: new Date(new Date(0).getTime() + 600_000),
      expiresAt: new Date(Date.now() + 86400_000),
      impersonatedBy: null,
    },
    {
      createdAt: new Date(),
      authorizedUntil: new Date(new Date().getTime() + 600_000),
      expiresAt: new Date(Date.now() + 86400_000),
      impersonatedBy: 7,
    },
  ])(
    "rejects unsafe sessions before sending a change request: %j",
    async (session) => {
      mocks.getCurrentSession.mockResolvedValue({ ...session, userId: 12 });
      await expect(
        createEmailChange({ linkPath: "/profile" }).request(
          context({ email: "new@example.com", userId: 12 }),
        ),
      ).rejects.toMatchObject({ status: 403 });
      expect(mocks.sendCode).not.toHaveBeenCalled();
      expect(mocks.mailer).not.toHaveBeenCalled();
    },
  );
});

describe("email change confirmation", () => {
  const proof = {
    email: "new@example.com",
    state: "proven",
    verificationId: 3,
  };
  const changedState = { ...signedInState, email: "new@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consume.mockResolvedValue({ id: 3 });
    mocks.loadFreshPublicAuthState.mockResolvedValue(changedState);
    mocks.updateWhere.mockResolvedValue(undefined);
    mocks.verifyCode.mockResolvedValue(proof);
    transactionWith({
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [{ email: "old@example.com" }] }),
        }),
      }),
      update: () => ({ set: () => ({ where: mocks.updateWhere }) }),
      delete: () => ({ where: mocks.deleteWhere }),
    });
  });

  it("applies the proven address to the signed-in account", async () => {
    await expect(
      createEmailChange({ linkPath: "/profile" }).verifyCode(
        context({ challengeKey, code: "123456", userId: 12 }),
      ),
    ).resolves.toEqual({ authState: changedState });
    expect(mocks.consume).toHaveBeenCalledWith(
      3,
      "new@example.com",
      expect.anything(),
      { kind: "email-change", userId: 12 },
    );
    expect(mocks.verifyCode).toHaveBeenCalledWith({
      challengeKey,
      code: "123456",
      kind: "email-change",
      userId: 12,
    });
    // Every existing session is revoked, and only then is the current browser
    // signed in again, so the new session survives.
    expect(mocks.deleteWhere).toHaveBeenCalledOnce();
    expect(mocks.revalidateTag).toHaveBeenCalledWith("auth-user-sessions:12", {
      expire: 0,
    });
    expect(mocks.login).toHaveBeenCalledWith(12, "email");
    expect(mocks.deleteWhere.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.login.mock.invocationCallOrder[0],
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "email-changed",
        data: { from: "old@example.com", to: "new@example.com" },
        userId: 12,
      }),
    );
  });

  it("does not change the address when the request has ended", async () => {
    mocks.consume.mockResolvedValue(undefined);

    await expect(
      createEmailChange({ linkPath: "/profile" }).verifyCode(
        context({ challengeKey, code: "123456", userId: 12 }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.updateWhere).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects a conflict that appears only after the code was accepted and ends the proof", async () => {
    mocks.updateWhere.mockRejectedValue(
      Object.assign(new Error("Failed query"), {
        cause: { code: "23505", constraint_name: "users_email_unique_active" },
      }),
    );

    await expect(
      createEmailChange({ linkPath: "/profile" }).verifyCode(
        context({ challengeKey, code: "123456", userId: 12 }),
      ),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.endVerification).toHaveBeenCalledWith(
      expect.anything(),
      3,
      expect.any(Date),
    );
    expect(mocks.login).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("requires a signed-in session at confirmation time", async () => {
    mocks.getCurrentSession.mockResolvedValue(undefined);

    await expect(
      createEmailChange({ linkPath: "/profile" }).verifyCode(
        context({ challengeKey, code: "123456", userId: 12 }),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  // The code step ends with its issuing session; an acceptable link asks for confirmation.
  it.each([
    ["verifyCode", { code: verificationEndedCode, status: 409 }],
    ["verifyLink", { code: "reauthentication-required", status: 403 }],
  ] as const)(
    "rechecks recent authentication when applying through %s",
    async (method, refusal) => {
      mocks.getCurrentSession.mockResolvedValue({
        createdAt: new Date(0),
        authorizedUntil: new Date(new Date(0).getTime() + 600_000),
        expiresAt: new Date(Date.now() + 86400_000),
        impersonatedBy: null,
        userId: 12,
      });
      mocks.checkLink.mockResolvedValue("acceptable");
      mocks.verifyLink.mockResolvedValue(proof);
      await expect(
        createEmailChange({ linkPath: "/profile" })[method](
          context({
            challengeKey,
            code: "123456",
            token: "a".repeat(43),
            userId: 12,
          }),
        ),
      ).rejects.toMatchObject(refusal);
      expect(mocks.consume).not.toHaveBeenCalled();
      expect(mocks.updateWhere).not.toHaveBeenCalled();
      expect(mocks.deleteWhere).not.toHaveBeenCalled();
      expect(mocks.login).not.toHaveBeenCalled();
    },
  );

  it("confirms from the emailed link the same way", async () => {
    mocks.verifyLink.mockResolvedValue(proof);

    await expect(
      createEmailChange({ linkPath: "/profile" }).verifyLink(
        context({ token: "a".repeat(43), userId: 12 }),
      ),
    ).resolves.toEqual({ authState: changedState });
    expect(mocks.consume).toHaveBeenCalledOnce();
    expect(mocks.updateWhere).toHaveBeenCalledOnce();
  });

  it("rejects an unusable link without changing anything", async () => {
    mocks.verifyLink.mockResolvedValue({ state: "wrong-browser" });

    await expect(
      createEmailChange({ linkPath: "/profile" }).verifyLink(
        context({ token: "a".repeat(43), userId: 12 }),
      ),
    ).rejects.toMatchObject({ code: "wrong-browser", status: 409 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("email change cancellation", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");

  function noticedRow(overrides: Record<string, unknown> = {}) {
    return {
      email: "new@example.com",
      endedAt: null,
      expiresAt: new Date("2026-09-16T12:10:00.000Z"),
      id: 3,
      kind: "email-change",
      provenAt: null,
      userId: 12,
      ...overrides,
    };
  }

  function transactionFinding(row: Record<string, unknown> | undefined) {
    const query = {
      from: vi.fn(),
      limit: vi.fn().mockResolvedValue(row ? [row] : []),
      where: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    transactionWith({ execute: vi.fn(), select: () => query });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ends a request that is still waiting to be confirmed", async () => {
    transactionFinding({ ...noticedRow(), verificationKeyHash: "hash" });
    mocks.loadVerifications.mockResolvedValue([
      noticedRow({ id: 4 }),
      noticedRow(),
      noticedRow({ email: "earlier@example.com", id: 2 }),
    ]);

    await expect(
      createEmailChange({ linkPath: "/profile" }).cancel(
        context({ challengeKey }),
      ),
    ).resolves.toEqual({ outcome: "cancelled" });
    expect(mocks.endVerification).toHaveBeenCalledTimes(2);
    expect(mocks.endVerification).toHaveBeenCalledWith(
      expect.anything(),
      4,
      now,
    );
  });

  it("ends a resend made after a login request in the same browser", async () => {
    transactionFinding({ ...noticedRow(), verificationKeyHash: "hash" });
    mocks.loadVerifications.mockResolvedValue([
      noticedRow({ id: 5 }),
      noticedRow({
        email: "person@example.com",
        id: 4,
        kind: "login",
        userId: null,
      }),
      noticedRow(),
    ]);

    await expect(
      createEmailChange({ linkPath: "/profile" }).cancel(
        context({ challengeKey }),
      ),
    ).resolves.toEqual({ outcome: "cancelled" });
    expect(mocks.endVerification).toHaveBeenCalledTimes(2);
    expect(mocks.endVerification).toHaveBeenCalledWith(
      expect.anything(),
      5,
      now,
    );
    expect(mocks.endVerification).not.toHaveBeenCalledWith(
      expect.anything(),
      4,
      now,
    );
  });

  it("reports a change that was already applied", async () => {
    transactionFinding({ ...noticedRow(), verificationKeyHash: "hash" });
    mocks.loadVerifications.mockResolvedValue([
      noticedRow({ endedAt: now, id: 4, provenAt: now }),
      noticedRow(),
    ]);

    await expect(
      createEmailChange({ linkPath: "/profile" }).cancel(
        context({ challengeKey }),
      ),
    ).resolves.toEqual({ outcome: "completed" });
    expect(mocks.endVerification).not.toHaveBeenCalled();
  });

  it("reports an unknown or already ended request", async () => {
    transactionFinding(undefined);
    await expect(
      createEmailChange({ linkPath: "/profile" }).cancel(
        context({ challengeKey }),
      ),
    ).resolves.toEqual({ outcome: "unknown" });

    transactionFinding({ ...noticedRow(), verificationKeyHash: "hash" });
    mocks.loadVerifications.mockResolvedValue([noticedRow({ endedAt: now })]);
    await expect(
      createEmailChange({ linkPath: "/profile" }).cancel(
        context({ challengeKey }),
      ),
    ).resolves.toEqual({ outcome: "unknown" });
    expect(mocks.endVerification).not.toHaveBeenCalled();
  });
});
