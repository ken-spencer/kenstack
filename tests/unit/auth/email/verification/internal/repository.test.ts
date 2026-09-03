import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  isNotNull: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  lte: vi.fn(() => ({})),
  ne: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
}));
vi.mock("@kenstack/db/tables/verification", () => ({ verifications: {} }));

import { createChallengeSecrets } from "@kenstack/auth/email/verification/internal/crypto";
import {
  proveVerification,
  resolveCodeAttempt,
} from "@kenstack/auth/email/verification/internal/repository";

type ResolveCodeAttemptTransaction = Parameters<typeof resolveCodeAttempt>[0];
type VerificationRecord = Parameters<typeof resolveCodeAttempt>[1]["current"];

function updateQuery(returning?: unknown[]) {
  const query = {
    returning: vi.fn().mockResolvedValue(returning ?? []),
    set: vi.fn(),
    where: vi.fn(),
  };
  query.set.mockReturnValue(query);
  query.where.mockReturnValue(returning ? query : Promise.resolve([]));
  return query;
}

describe("proveVerification", () => {
  it("starts the proof lifetime when the challenge is accepted", async () => {
    const requestUpdate = updateQuery([{ id: 3 }]);
    const tx = {
      update: vi.fn().mockReturnValueOnce(requestUpdate),
    };
    const now = new Date("2026-08-17T18:00:00.000Z");

    await expect(
      proveVerification(tx as never, {
        now,
        verificationId: 3,
      }),
    ).resolves.toEqual(new Date("2026-08-17T19:00:00.000Z"));
    expect(requestUpdate.set).toHaveBeenCalledWith({
      expiresAt: new Date("2026-08-17T19:00:00.000Z"),
      provenAt: now,
    });
    expect(tx.update).toHaveBeenCalledOnce();
  });
});

describe("resolveCodeAttempt", () => {
  const createRecord = (secrets: ReturnType<typeof createChallengeSecrets>) =>
    ({
      codeHash: secrets.codeHash,
      codeSalt: secrets.codeSalt,
      email: "person@example.com",
      failedAttempts: 0,
      id: 1,
    }) as VerificationRecord;

  // Stale-code lookup: select(...).from().where().orderBy().limit() → rows.
  const createSelectQuery = (rows: unknown[]) => {
    const query = {
      from: vi.fn(),
      limit: vi.fn().mockResolvedValue(rows),
      orderBy: vi.fn(),
      where: vi.fn(),
    };
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    return query;
  };

  it("reports a code from an ended or expired request as expired without consuming an attempt", async () => {
    const current = createChallengeSecrets();
    const stale = createChallengeSecrets();
    const update = vi.fn();
    const select = vi.fn(() =>
      createSelectQuery([
        { codeHash: stale.codeHash, codeSalt: stale.codeSalt },
      ]),
    );

    await expect(
      resolveCodeAttempt(
        { select, update } as unknown as ResolveCodeAttemptTransaction,
        {
          code: stale.code,
          current: createRecord(current),
          previous: [],
        },
      ),
    ).resolves.toBe("expired");
    expect(update).not.toHaveBeenCalled();
  });

  it("reports a stale code as expired on the last permitted attempt", async () => {
    const current = createChallengeSecrets();
    const stale = createChallengeSecrets();
    const update = vi.fn();
    const select = vi.fn(() =>
      createSelectQuery([
        { codeHash: stale.codeHash, codeSalt: stale.codeSalt },
      ]),
    );

    await expect(
      resolveCodeAttempt(
        { select, update } as unknown as ResolveCodeAttemptTransaction,
        {
          code: stale.code,
          current: { ...createRecord(current), failedAttempts: 4 },
          previous: [],
        },
      ),
    ).resolves.toBe("expired");
    expect(update).not.toHaveBeenCalled();
  });

  it("counts a code matching nothing as an incorrect attempt", async () => {
    const current = createChallengeSecrets();
    const incorrectCode = current.code === "000000" ? "000001" : "000000";
    const select = vi.fn(() => createSelectQuery([]));
    const update = vi.fn(() => updateQuery());

    await expect(
      resolveCodeAttempt(
        { select, update } as unknown as ResolveCodeAttemptTransaction,
        {
          code: incorrectCode,
          current: createRecord(current),
          previous: [],
        },
      ),
    ).resolves.toBe("incorrect");
    expect(update).toHaveBeenCalledOnce();
  });
});
