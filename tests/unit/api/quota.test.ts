import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({
  db: { transaction: mocks.transaction },
}));
vi.mock("@vercel/functions", () => ({ waitUntil: vi.fn() }));
vi.mock("@kenstack/lib/errorLog", () => ({ default: vi.fn() }));

import { checkQuota, claimQuota } from "@kenstack/api/quota";

describe("quota configuration", () => {
  it("requires a non-empty scope", async () => {
    await expect(checkQuota("   ", { ip: "203.0.113.7" })).rejects.toThrow(
      "Quota scope is required",
    );
  });

  it("requires positive integer maxima", async () => {
    await expect(
      checkQuota("test", {
        ip: "203.0.113.7",
        limits: { ip: [0, "15 minutes"] },
      }),
    ).rejects.toThrow("Quota limits require a positive integer maximum");
  });

  it("rejects scoped windows longer than the site-wide window", async () => {
    await expect(
      checkQuota("test", {
        ip: "203.0.113.7",
        limits: { ip: [10, "2 hours"] },
      }),
    ).rejects.toThrow("Quota ip windows cannot exceed the site-wide window");
  });

  it("rejects a call with no subject instead of allowing it", async () => {
    await expect(claimQuota("test")).rejects.toThrow(
      "Quota test needs an email or IP subject",
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("counts only the subjects given", async () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const values = vi.fn().mockResolvedValue(undefined);
    const where = vi.fn().mockResolvedValue([{ scoped: 0, site: 0 }]);
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      insert: () => ({ values }),
      select: () => ({ from: () => ({ where }) }),
    };

    await expect(
      claimQuota("test", { email: "person@example.com" }, tx as never),
    ).resolves.toBeNull();
    expect(where).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ email: "person@example.com", ip: null }),
    );
  });

  it("claims on a caller-supplied transaction without opening its own", async () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const values = vi.fn().mockResolvedValue(undefined);
    const tx = {
      execute: vi.fn().mockResolvedValue(undefined),
      insert: () => ({ values }),
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([{ scoped: 0, site: 0 }]),
        }),
      }),
    };

    await expect(
      claimQuota("test", { ip: "203.0.113.7" }, tx as never),
    ).resolves.toBeNull();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ ip: "203.0.113.7", scope: "test" }),
    );
  });
});
