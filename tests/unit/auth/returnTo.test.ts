import { describe, expect, it, vi } from "vitest";

import { resolveLoginDestination } from "@kenstack/auth/returnTo";
import type { PublicAuthState } from "@kenstack/auth/server/state";

const signedIn: PublicAuthState = {
  avatar: null,
  email: "person@example.com",
  familyName: "Person",
  givenName: "Some",
  initials: "SP",
  name: "Some Person",
  roles: [],
  state: "authenticated",
  userId: 12,
};

describe("resolveLoginDestination", () => {
  it("prefers a safe return path over the host's destination", async () => {
    const loginDestination = vi.fn().mockReturnValue("/account");

    await expect(
      resolveLoginDestination("/membership", signedIn, loginDestination),
    ).resolves.toBe("/membership");
    expect(loginDestination).not.toHaveBeenCalled();
  });

  it("asks the host only when no safe return path exists", async () => {
    const loginDestination = vi.fn().mockResolvedValue("/account");

    await expect(
      resolveLoginDestination(
        "https://evil.example/",
        signedIn,
        loginDestination,
      ),
    ).resolves.toBe("/account");
    expect(loginDestination).toHaveBeenCalledWith(signedIn);
    await expect(
      resolveLoginDestination(undefined, signedIn, loginDestination),
    ).resolves.toBe("/account");
  });

  it("falls back to the home page for an unsafe or absent destination", async () => {
    await expect(
      resolveLoginDestination(undefined, signedIn, () => "//evil.example/"),
    ).resolves.toBe("/");
    await expect(resolveLoginDestination(undefined, signedIn)).resolves.toBe(
      "/",
    );
    await expect(
      resolveLoginDestination(
        undefined,
        { email: "person@example.com", state: "proven" },
        () => "/account",
      ),
    ).resolves.toBe("/");
  });
});
