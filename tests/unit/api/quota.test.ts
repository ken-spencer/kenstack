import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: { transaction: mocks.transaction },
}));
vi.mock("@vercel/functions", () => ({ waitUntil: vi.fn() }));
vi.mock("@kenstack/lib/errorLog", () => ({ default: vi.fn() }));

import { claimQuota } from "@kenstack/api/quota";

// Each case must reject before a claim reaches the database; a removed guard
// would open the mocked transaction and resolve instead.
describe("quota configuration", () => {
  beforeEach(() => {
    mocks.transaction.mockClear();
  });

  it("requires a non-empty scope", async () => {
    await expect(claimQuota("   ", { ip: "203.0.113.7" })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires positive integer maxima", async () => {
    await expect(
      claimQuota("test", {
        ip: "203.0.113.7",
        limits: { ip: [0, "15 minutes"] },
      }),
    ).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects scoped windows longer than the site-wide window", async () => {
    await expect(
      claimQuota("test", {
        ip: "203.0.113.7",
        limits: { ip: [10, "2 hours"] },
      }),
    ).rejects.toThrow(RangeError);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a call with no subject instead of allowing it", async () => {
    await expect(claimQuota("test")).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
