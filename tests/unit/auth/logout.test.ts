import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@app/db", () => ({ db: {} }));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

import { logout } from "@kenstack/auth/server/auth";

describe("logout", () => {
  it("clears verification state even without an active user session", async () => {
    const cookieStore = {
      delete: vi.fn(),
      get: vi.fn().mockReturnValue(undefined),
    };
    mocks.cookies.mockResolvedValue(cookieStore);
    await logout();

    expect(cookieStore.delete).toHaveBeenCalledWith("verification");
  });
});
