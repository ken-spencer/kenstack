import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  consume: vi.fn(),
  endVerification: vi.fn(),
  loadEmailFrom: vi.fn(),
  loadFreshAuthState: vi.fn(),
  loadFreshPublicAuthState: vi.fn(),
  loadPublicAuthState: vi.fn(),
  loadVerifications: vi.fn(),
  mailer: vi.fn(),
  render: vi.fn(),
  reportError: vi.fn(),
  revalidateTag: vi.fn(),
  sendCode: vi.fn(),
  findUser: vi.fn(),
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
vi.mock("@app/email", () => ({
  attachments: [],
  loadEmailFrom: mocks.loadEmailFrom,
}));
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
  loadFreshAuthState: mocks.loadFreshAuthState,
  loadFreshPublicAuthState: mocks.loadFreshPublicAuthState,
  loadPublicAuthState: mocks.loadPublicAuthState,
}));
vi.mock("@kenstack/auth/server/user", () => ({
  userSessionsCacheTag: (userId: number) => `auth-user-sessions:${userId}`,
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
  verifyLink: mocks.verifyLink,
}));
vi.mock("@kenstack/auth/email/change/NoticeEmail", () => ({
  default: () => null,
}));

import { createEmailChange } from "@kenstack/auth/email/change/api";

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

describe("email change request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUser.mockResolvedValue(undefined);
    mocks.loadEmailFrom.mockResolvedValue("sender@example.com");
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
      createEmailChange().request(context({ email: "old@example.com" })),
    ).resolves.toMatchObject({
      fieldErrors: { email: "That is already your email address" },
    });
    expect(mocks.sendCode).not.toHaveBeenCalled();
    expect(mocks.mailer).not.toHaveBeenCalled();
  });

  it("sends the code to the new address and a cancellable notice to the old one", async () => {
    await expect(
      createEmailChange({ linkPath: "/profile" }).request(
        context({ email: "new@example.com" }),
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
        subject: "Your sign-in email is being changed",
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
      createEmailChange().request(context({ email: "new@example.com" })),
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
        subject: "This email already has an account",
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
      createEmailChange().request(context({ email: "new@example.com" })),
    ).resolves.toMatchObject({ challengeKey });
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it("reports an unexpected notice failure without blocking the change", async () => {
    mocks.mailer.mockRejectedValue(new Error("render failed"));

    await expect(
      createEmailChange().request(context({ email: "new@example.com" })),
    ).resolves.toMatchObject({ challengeKey });
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });

  it("does not repeat the notice on a resend", async () => {
    await createEmailChange().request(
      context({ challengeKey, email: "new@example.com" }),
    );

    expect(mocks.sendCode.mock.lastCall?.[0]).toMatchObject({ challengeKey });
    expect(mocks.mailer).not.toHaveBeenCalled();
  });
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
    mocks.loadFreshAuthState.mockResolvedValue(signedInState);
    mocks.loadFreshPublicAuthState.mockResolvedValue(changedState);
    mocks.updateWhere.mockResolvedValue(undefined);
    mocks.verifyCode.mockResolvedValue(proof);
    transactionWith({
      update: () => ({ set: () => ({ where: mocks.updateWhere }) }),
    });
  });

  it("applies the proven address to the signed-in account", async () => {
    await expect(
      createEmailChange().verifyCode(context({ challengeKey, code: "123456" })),
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
    expect(mocks.updateWhere).toHaveBeenCalledOnce();
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "email-changed",
        data: { from: "old@example.com", to: "new@example.com" },
        userId: 12,
      }),
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("auth-user-sessions:12", {
      expire: 0,
    });
  });

  it("does not change the address when the request has ended", async () => {
    mocks.consume.mockResolvedValue(undefined);

    await expect(
      createEmailChange().verifyCode(context({ challengeKey, code: "123456" })),
    ).rejects.toMatchObject({ status: 409 });
    expect(mocks.updateWhere).not.toHaveBeenCalled();
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("explains a conflict that appears only after the code was accepted", async () => {
    mocks.updateWhere.mockRejectedValue(
      Object.assign(new Error("Failed query"), {
        cause: { code: "23505", constraint_name: "users_email_unique_active" },
      }),
    );

    await expect(
      createEmailChange().verifyCode(context({ challengeKey, code: "123456" })),
    ).rejects.toMatchObject({
      message:
        "That change could not be completed. Enter the address again to start over.",
      status: 409,
    });
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("requires a signed-in session at confirmation time", async () => {
    mocks.loadFreshAuthState.mockResolvedValue({ state: "anonymous" });

    await expect(
      createEmailChange().verifyCode(context({ challengeKey, code: "123456" })),
    ).rejects.toMatchObject({ status: 401 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("confirms from the emailed link the same way", async () => {
    mocks.verifyLink.mockResolvedValue(proof);

    await expect(
      createEmailChange().verifyLink(context({ token: "a".repeat(43) })),
    ).resolves.toEqual({ authState: changedState });
    expect(mocks.consume).toHaveBeenCalledOnce();
  });

  it("rejects an unusable link without changing anything", async () => {
    mocks.verifyLink.mockResolvedValue({ state: "wrong-browser" });

    await expect(
      createEmailChange().verifyLink(context({ token: "a".repeat(43) })),
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
      createEmailChange().cancel(context({ challengeKey })),
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
      createEmailChange().cancel(context({ challengeKey })),
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
      createEmailChange().cancel(context({ challengeKey })),
    ).resolves.toEqual({ outcome: "completed" });
    expect(mocks.endVerification).not.toHaveBeenCalled();
  });

  it("reports an unknown or already ended request", async () => {
    transactionFinding(undefined);
    await expect(
      createEmailChange().cancel(context({ challengeKey })),
    ).resolves.toEqual({ outcome: "unknown" });

    transactionFinding({ ...noticedRow(), verificationKeyHash: "hash" });
    mocks.loadVerifications.mockResolvedValue([noticedRow({ endedAt: now })]);
    await expect(
      createEmailChange().cancel(context({ challengeKey })),
    ).resolves.toEqual({ outcome: "unknown" });
    expect(mocks.endVerification).not.toHaveBeenCalled();
  });
});
