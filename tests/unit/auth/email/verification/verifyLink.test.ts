import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getKey: vi.fn(),
  prove: vi.fn(),
  setCookie: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  desc: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));
vi.mock("@app/db", () => ({
  db: { transaction: mocks.transaction },
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@kenstack/db/tables/verification", () => ({ verifications: {} }));
vi.mock("@kenstack/auth/email/verification/internal/repository", () => ({
  proveVerification: mocks.prove,
}));
vi.mock("@kenstack/auth/email/verification/internal/cookie", () => ({
  getVerificationKey: mocks.getKey,
  setVerificationCookie: mocks.setCookie,
}));

import { verifyLink } from "@kenstack/auth/email/verification/verifyLink";
import { hashVerificationKey } from "@kenstack/auth/email/verification/internal/crypto";

const token = "a".repeat(43);
const proofExpiresAt = new Date("2030-01-01T01:00:00.000Z");

function queryResult(record: Record<string, unknown>) {
  const query = {
    for: vi.fn().mockResolvedValue([record]),
    from: vi.fn(),
    limit: vi.fn(),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

function latestVerificationResult(id = 3) {
  const query = {
    from: vi.fn(),
    limit: vi.fn().mockResolvedValue([{ id }]),
    orderBy: vi.fn(),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

function transactionWith(record: Record<string, unknown>, latestId = 3) {
  const tx = {
    execute: vi.fn(),
    select: vi
      .fn()
      .mockReturnValueOnce(queryResult(record))
      .mockReturnValueOnce(latestVerificationResult(latestId)),
  };
  mocks.transaction.mockImplementation((callback) => callback(tx));
  return tx;
}

function verificationRecord(overrides: Record<string, unknown> = {}) {
  return {
    endedAt: null,
    email: "person@example.com",
    expiresAt: new Date("2030-01-01T00:15:00.000Z"),
    isDecoy: false,
    verificationId: 3,
    verificationKeyHash: hashVerificationKey("verification-key"),
    provenAt: null,
    ...overrides,
  };
}

describe("verifyLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    mocks.getCurrentUser.mockResolvedValue(undefined);
    mocks.getKey.mockResolvedValue(undefined);
    mocks.prove.mockResolvedValue(proofExpiresAt);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves a browser-bound link active when opened elsewhere", async () => {
    transactionWith(verificationRecord());

    await expect(verifyLink(token)).resolves.toEqual({
      state: "wrong-browser",
    });
    expect(mocks.prove).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("proves a browser-bound link in the requesting browser", async () => {
    transactionWith(verificationRecord());
    mocks.getKey.mockResolvedValue("verification-key");

    await expect(verifyLink(token)).resolves.toMatchObject({
      state: "proven",
    });
    expect(mocks.prove).toHaveBeenCalledOnce();
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "verification-key",
      proofExpiresAt,
    );
  });

  it("does not prove a decoy verification", async () => {
    transactionWith(verificationRecord({ isDecoy: true }));
    mocks.getKey.mockResolvedValue("verification-key");

    await expect(verifyLink(token)).resolves.toEqual({ state: "invalid" });
    expect(mocks.prove).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("proves a signed-in user's link for their own email", async () => {
    transactionWith(verificationRecord());
    mocks.getCurrentUser.mockResolvedValue({
      email: " Person@Example.com ",
    });
    mocks.getKey.mockResolvedValue("verification-key");

    await expect(verifyLink(token)).resolves.toMatchObject({
      email: "person@example.com",
      state: "proven",
    });
    expect(mocks.prove).toHaveBeenCalledOnce();
  });

  it("leaves another account's link active for the signed-in user", async () => {
    transactionWith(verificationRecord());
    mocks.getCurrentUser.mockResolvedValue({ email: "other@example.com" });
    mocks.getKey.mockResolvedValue("verification-key");

    await expect(verifyLink(token)).resolves.toEqual({
      state: "wrong-account",
    });
    expect(mocks.prove).not.toHaveBeenCalled();
    expect(mocks.setCookie).not.toHaveBeenCalled();
  });

  it("leaves email proof active while impersonating another user", async () => {
    transactionWith(verificationRecord());
    mocks.getCurrentUser.mockResolvedValue({
      email: "person@example.com",
      impersonatedBy: 42,
    });
    mocks.getKey.mockResolvedValue("verification-key");

    await expect(verifyLink(token)).resolves.toEqual({
      state: "wrong-account",
    });
    expect(mocks.prove).not.toHaveBeenCalled();
  });

  it("does not describe an expired link as active for another account", async () => {
    transactionWith(
      verificationRecord({
        expiresAt: new Date("2029-12-31T23:59:00.000Z"),
      }),
    );
    mocks.getCurrentUser.mockResolvedValue({ email: "other@example.com" });

    await expect(verifyLink(token)).resolves.toEqual({ state: "expired" });
  });

  it("keeps proven state usable after the original challenge expires", async () => {
    const existingProofExpiresAt = new Date("2030-01-01T00:45:00.000Z");
    transactionWith(
      verificationRecord({
        expiresAt: existingProofExpiresAt,
        provenAt: new Date("2029-12-31T23:59:00.000Z"),
      }),
    );
    mocks.getKey.mockResolvedValue("verification-key");

    await expect(verifyLink(token)).resolves.toMatchObject({
      state: "proven",
    });
    expect(mocks.prove).not.toHaveBeenCalled();
  });

  it("rejects a link from an older challenge", async () => {
    transactionWith(verificationRecord(), 4);

    await expect(verifyLink(token)).resolves.toEqual({
      state: "invalid",
    });
    expect(mocks.prove).not.toHaveBeenCalled();
  });
});
