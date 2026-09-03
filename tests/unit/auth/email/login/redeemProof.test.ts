import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  findUser: vi.fn(),
  getVerificationKey: vi.fn(),
  loadFreshAuthState: vi.fn(),
  login: vi.fn(),
  restoreConsumed: vi.fn(),
  setVerificationCookie: vi.fn(),
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
  db: { query: { users: { findFirst: mocks.findUser } } },
}));
vi.mock("@kenstack/auth/server/auth", () => ({ login: mocks.login }));
vi.mock("@kenstack/auth/server/state", () => ({
  loadFreshAuthState: mocks.loadFreshAuthState,
}));
vi.mock("@kenstack/auth/email/verification/internal/repository", () => ({
  consumeVerification: mocks.consume,
  restoreVerification: mocks.restoreConsumed,
}));
vi.mock("@kenstack/auth/email/verification/internal/cookie", () => ({
  getVerificationKey: mocks.getVerificationKey,
  setVerificationCookie: mocks.setVerificationCookie,
}));

import { redeemEmailProof } from "@kenstack/auth/email/login/redeemProof";

const verification = {
  email: "person@example.com",
  verificationId: 3,
};

describe("redeemEmailProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consume.mockResolvedValue({
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      id: 3,
    });
    mocks.getVerificationKey.mockResolvedValue("verification-key");
    mocks.login.mockResolvedValue(undefined);
  });

  it("consumes proven state before establishing the user session", async () => {
    mocks.findUser.mockResolvedValue({ id: 12 });
    mocks.loadFreshAuthState.mockResolvedValue({
      ...verification,
      state: "proven",
    });

    await expect(redeemEmailProof(verification)).resolves.toBe(12);
    expect(mocks.consume).toHaveBeenCalledWith(3, "person@example.com");
    expect(mocks.login).toHaveBeenCalledWith(12, "email");
  });

  it("throws without consuming proof when no account exists", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.loadFreshAuthState.mockResolvedValue({
      ...verification,
      state: "proven",
    });

    await expect(redeemEmailProof(verification)).rejects.toThrow();
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("preserves proven state when enrollment allows a missing account", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.loadFreshAuthState.mockResolvedValue({
      ...verification,
      state: "proven",
    });

    await expect(
      redeemEmailProof(verification, { allowUnregistered: true }),
    ).resolves.toBeUndefined();
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("returns a conflict when the proven request was replaced", async () => {
    mocks.loadFreshAuthState.mockResolvedValue({
      challengeKey: "replacement",
      email: "person@example.com",
      state: "code-sent",
    });

    await expect(redeemEmailProof(verification)).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("restores proof when establishing the user session fails", async () => {
    const failure = new Error("session failed");
    mocks.findUser.mockResolvedValue({ id: 12 });
    mocks.loadFreshAuthState.mockResolvedValue({
      ...verification,
      state: "proven",
    });
    mocks.login.mockRejectedValue(failure);

    await expect(redeemEmailProof(verification)).rejects.toBe(failure);
    expect(mocks.restoreConsumed).toHaveBeenCalledOnce();
    expect(mocks.setVerificationCookie).toHaveBeenCalledWith(
      "verification-key",
      new Date("2030-01-01T00:00:00.000Z"),
    );
  });

  it("consumes a matching proof and refreshes an authenticated session", async () => {
    mocks.loadFreshAuthState.mockResolvedValue({
      email: "person@example.com",
      roles: [],
      state: "authenticated",
      userId: 12,
    });

    await expect(redeemEmailProof(verification)).resolves.toBe(12);
    expect(mocks.findUser).not.toHaveBeenCalled();
    expect(mocks.consume).toHaveBeenCalledWith(3, "person@example.com");
    expect(mocks.login).toHaveBeenCalledWith(12, "email");
  });

  it("does not consume proof for another authenticated account", async () => {
    mocks.loadFreshAuthState.mockResolvedValue({
      email: "other@example.com",
      roles: [],
      state: "authenticated",
      userId: 24,
    });

    await expect(redeemEmailProof(verification)).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("does not refresh an impersonated session", async () => {
    mocks.loadFreshAuthState.mockResolvedValue({
      email: "person@example.com",
      impersonatedBy: 42,
      roles: [],
      state: "authenticated",
      userId: 12,
    });

    await expect(redeemEmailProof(verification)).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
