import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  geolocation: vi.fn(),
  headers: vi.fn(),
  getIp: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@vercel/functions", () => ({ geolocation: mocks.geolocation }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@kenstack/lib/ip", () => ({ default: mocks.getIp }));
vi.mock("@app/db", () => ({ db: {} }));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import { audit } from "@kenstack/logger";

describe("audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
    mocks.geolocation.mockReturnValue({});
    mocks.getIp.mockResolvedValue("203.0.113.7");
  });

  it("treats an explicit null user ID as deliberately unattributed", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn(() => ({ values })) };
    mocks.getCurrentUser.mockResolvedValue({ id: 42 });

    await audit({ action: "password-failure", db, userId: null });

    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "password-failure",
        impersonatedBy: null,
        userId: null,
      }),
    );
  });

  it("resolves an omitted user ID from the current user", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn(() => ({ values })) };
    mocks.getCurrentUser.mockResolvedValue({ id: 42, impersonatedBy: 7 });

    await audit({ action: "record-updated", db });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "record-updated",
        impersonatedBy: 7,
        userId: 42,
      }),
    );
  });

  it("preserves an explicitly attributed user ID", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = { insert: vi.fn(() => ({ values })) };
    mocks.getCurrentUser.mockResolvedValue({ id: 42, impersonatedBy: 7 });

    await audit({ action: "record-updated", db, userId: 99 });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "record-updated",
        impersonatedBy: 7,
        userId: 99,
      }),
    );
  });
});
