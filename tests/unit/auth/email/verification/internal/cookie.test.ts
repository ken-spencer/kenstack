import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  set: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.set }),
}));

import { setVerificationCookie } from "@kenstack/auth/email/verification/internal/cookie";

describe("setVerificationCookie", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.set.mockClear();
  });

  it("permits an HTTP cookie in the development environment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEVELOPMENT", "1");

    await setVerificationCookie("key", new Date(Date.now() + 60_000));

    expect(mocks.set).toHaveBeenCalledWith(
      "verification",
      "key",
      expect.objectContaining({ secure: false }),
    );
  });

  it("uses a secure cookie in production otherwise", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEVELOPMENT", "");

    await setVerificationCookie("key", new Date(Date.now() + 60_000));

    expect(mocks.set).toHaveBeenCalledWith(
      "verification",
      "key",
      expect.objectContaining({ secure: true }),
    );
  });
});
