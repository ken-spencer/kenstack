import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getFreshCurrentUser: vi.fn(),
  getVerificationKey: vi.fn(),
  select: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));
vi.mock("@kenstack/auth/email/verification/internal/cookie", () => ({
  getVerificationKey: mocks.getVerificationKey,
}));
vi.mock("@app/db", () => ({ db: { select: mocks.select } }));
vi.mock("@kenstack/auth/server/user", () => ({
  getCurrentUser: mocks.getCurrentUser,
  getFreshCurrentUser: mocks.getFreshCurrentUser,
}));

import {
  loadFreshAuthState,
  loadPublicAuthState,
} from "@kenstack/auth/server/state";

function selectResult(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    orderBy: vi.fn(),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.orderBy.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

describe("loadAuthState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(undefined);
    mocks.getFreshCurrentUser.mockResolvedValue(undefined);
    mocks.getVerificationKey.mockResolvedValue("verification-key");
  });

  it("does not fall back to an older code after the newest row ends", async () => {
    mocks.select.mockReturnValue(
      selectResult([
        {
          challengeKey: "newest-challenge",
          email: "person@example.com",
          endedAt: new Date(),
          expiresAt: new Date(Date.now() + 60_000),
          provenAt: null,
        },
      ]),
    );

    await expect(loadFreshAuthState()).resolves.toEqual({
      state: "anonymous",
    });
    expect(mocks.getFreshCurrentUser).toHaveBeenCalledOnce();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.select).toHaveBeenCalledOnce();
  });

  it("exposes the same code-sent state for a decoy verification", async () => {
    mocks.select.mockReturnValue(
      selectResult([
        {
          challengeKey: "server-only-challenge",
          email: "person@example.com",
          endedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          id: 31,
          isDecoy: true,
          provenAt: null,
        },
      ]),
    );

    await expect(loadPublicAuthState()).resolves.toEqual({
      email: "person@example.com",
      state: "code-sent",
    });
  });

  it("removes the verification id from browser auth state", async () => {
    mocks.select.mockReturnValue(
      selectResult([
        {
          challengeKey: "server-only-challenge",
          email: "person@example.com",
          endedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          id: 31,
          provenAt: new Date(),
        },
      ]),
    );

    await expect(loadPublicAuthState()).resolves.toEqual({
      email: "person@example.com",
      state: "proven",
    });
  });

  it("keeps browser-ready account details in authenticated state", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      avatar: { height: 80, url: "/avatar.jpg", width: 80 },
      email: " Person@Example.com ",
      id: 12,
      impersonatedBy: 4,
      initials: "PE",
      name: "Person Example",
      roles: ["admin"],
    });

    await expect(loadPublicAuthState()).resolves.toEqual({
      avatar: { height: 80, url: "/avatar.jpg", width: 80 },
      email: "person@example.com",
      impersonatedBy: 4,
      initials: "PE",
      name: "Person Example",
      roles: ["admin"],
      state: "authenticated",
      userId: 12,
    });
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
