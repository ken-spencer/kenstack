import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loginDestination: vi.fn(),
}));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@kenstack/auth/server/getUsersModule", () => ({
  getUsersModule: () => ({ loginDestination: mocks.loginDestination }),
}));

import { resolveLoginDestination } from "@kenstack/auth/server/loginDestination";

const user = { id: 12 };

describe("resolveLoginDestination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.loginDestination.mockResolvedValue("/account");
  });

  it("prefers a safe return path over the users module's destination", async () => {
    await expect(resolveLoginDestination("/membership")).resolves.toBe(
      "/membership",
    );
    expect(mocks.loginDestination).not.toHaveBeenCalled();
  });

  it("asks the users module only when no safe return path exists", async () => {
    await expect(
      resolveLoginDestination("https://evil.example/"),
    ).resolves.toBe("/account");
    expect(mocks.loginDestination).toHaveBeenCalledWith(user);
    await expect(resolveLoginDestination(undefined)).resolves.toBe("/account");
  });

  it("falls back to the home page for an unsafe destination or no signed-in user", async () => {
    mocks.loginDestination.mockResolvedValue("//evil.example/");
    await expect(resolveLoginDestination(undefined)).resolves.toBe("/");

    mocks.getCurrentUser.mockResolvedValue(undefined);
    await expect(resolveLoginDestination(undefined)).resolves.toBe("/");
  });
});
