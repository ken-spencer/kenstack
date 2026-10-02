import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  findUser: vi.fn(),
  getVerificationKey: vi.fn(),
  freshUser: vi.fn(),
  loadLoginVerification: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
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
vi.mock("@kenstack/auth/server/auth", () => ({
  login: mocks.login,
  logout: mocks.logout,
}));
vi.mock("@kenstack/auth/server/state", () => ({
  loadLoginVerification: mocks.loadLoginVerification,
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getFreshCurrentUser: mocks.freshUser,
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

// The browser's proven login verification.
const provenVerification = {
  challengeKey: "challenge",
  email: "person@example.com",
  endedAt: null,
  expiresAt: new Date("2026-09-16T13:00:00Z"),
  id: 3,
  provenAt: new Date("2026-09-16T12:00:00Z"),
};

describe("redeemEmailProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consume.mockResolvedValue({
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      id: 3,
    });
    mocks.getVerificationKey.mockResolvedValue("verification-key");
    mocks.loadLoginVerification.mockResolvedValue(provenVerification);
    mocks.login.mockResolvedValue(undefined);
  });

  it("consumes proven state and establishes the user session", async () => {
    mocks.findUser.mockResolvedValue({ id: 12 });
    mocks.freshUser.mockResolvedValue(undefined);

    await expect(redeemEmailProof()).resolves.toBe(12);
    expect(mocks.consume).toHaveBeenCalledWith(3, "person@example.com");
    expect(mocks.login).toHaveBeenCalledWith(12, "email");
  });

  it("throws without consuming proof when no account exists", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.freshUser.mockResolvedValue(undefined);

    await expect(redeemEmailProof()).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("preserves proven state when enrollment allows a missing account", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.freshUser.mockResolvedValue(undefined);

    await expect(
      redeemEmailProof({ allowUnregistered: true }),
    ).resolves.toBeUndefined();
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("ends the current session before an unregistered address goes on to account creation", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.getVerificationKey.mockResolvedValue("browser-key");
    mocks.freshUser.mockResolvedValue({ email: "other@example.com", id: 7 });

    await expect(
      redeemEmailProof({ allowUnregistered: true }),
    ).resolves.toBeUndefined();
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.setVerificationCookie).toHaveBeenCalledWith(
      "browser-key",
      new Date("2026-09-16T13:00:00Z"),
    );
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("also ends an impersonation before account creation", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.getVerificationKey.mockResolvedValue("browser-key");
    mocks.freshUser.mockResolvedValue({
      email: "other@example.com",
      id: 7,
      impersonatedBy: 1,
    });

    await redeemEmailProof({ allowUnregistered: true });
    expect(mocks.logout).toHaveBeenCalledTimes(2);
  });

  it("returns a conflict when the proven request was replaced", async () => {
    // Signed out with an account to sign into, so only the replaced proof refuses.
    mocks.findUser.mockResolvedValue({ id: 12 });
    mocks.freshUser.mockResolvedValue(undefined);
    mocks.loadLoginVerification.mockResolvedValue({
      ...provenVerification,
      challengeKey: "replacement",
      id: 4,
      provenAt: null,
    });

    await expect(redeemEmailProof()).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("restores proof when establishing the user session fails", async () => {
    const failure = new Error("session failed");
    mocks.findUser.mockResolvedValue({ id: 12 });
    mocks.freshUser.mockResolvedValue(undefined);
    mocks.login.mockRejectedValue(failure);

    await expect(redeemEmailProof()).rejects.toBe(failure);
    expect(mocks.restoreConsumed).toHaveBeenCalledOnce();
    expect(mocks.setVerificationCookie).toHaveBeenCalledWith(
      "verification-key",
      new Date("2030-01-01T00:00:00.000Z"),
    );
  });

  it("consumes a matching proof and refreshes an authenticated session", async () => {
    mocks.freshUser.mockResolvedValue({ email: "person@example.com", id: 12 });

    await expect(redeemEmailProof()).resolves.toBe(12);
    expect(mocks.consume).toHaveBeenCalledWith(3, "person@example.com");
    expect(mocks.login).toHaveBeenCalledWith(12, "email");
  });

  it("switches a signed-in user to the proven email's account", async () => {
    mocks.findUser.mockResolvedValue({ id: 12 });
    mocks.freshUser.mockResolvedValue({ email: "other@example.com", id: 24 });

    await expect(redeemEmailProof()).resolves.toBe(12);
    expect(mocks.consume).toHaveBeenCalledWith(3, "person@example.com");
    expect(mocks.login).toHaveBeenCalledWith(12, "email");
  });

  it("does not switch a signed-in user to an email without an account", async () => {
    mocks.findUser.mockResolvedValue(undefined);
    mocks.freshUser.mockResolvedValue({ email: "other@example.com", id: 24 });

    await expect(redeemEmailProof()).rejects.toMatchObject({
      status: 409,
    });
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
