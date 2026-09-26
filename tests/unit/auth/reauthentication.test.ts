import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  authState: vi.fn(),
  findUser: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
  transaction: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  set: vi.fn(),
  login: vi.fn(),
  audit: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("bcrypt", () => ({
  default: { hash: mocks.hash, compare: mocks.compare },
}));
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@app/db", () => ({
  db: {
    transaction: mocks.transaction,
    query: { users: { findFirst: mocks.findUser } },
  },
}));
vi.mock("@app/modules", () => ({
  modules: { users: { admin: { table: { id: "id" } } } },
}));
vi.mock("@kenstack/logger", () => ({ audit: mocks.audit }));
vi.mock("@kenstack/auth/server/user", () => ({
  getFreshCurrentSession: mocks.session,
  userSessionsCacheTag: (id: number) => `auth-user-sessions:${id}`,
  requireUser: vi.fn(),
}));
vi.mock("@kenstack/auth/server/state", () => ({
  loadFreshAuthState: mocks.authState,
  loadFreshPublicAuthState: mocks.authState,
}));
vi.mock("@kenstack/auth/server/auth", () => ({
  login: mocks.login,
  hasAccess: vi.fn(),
  isAuthenticated: vi.fn(),
}));
vi.mock("@kenstack/lib/errorReporter", () => ({ reportError: vi.fn() }));
vi.mock("@kenstack/api", async () => {
  const { default: pipeline, pipelineStage } =
    await import("@kenstack/api/pipeline");
  return {
    pipeline,
    pipelineStage,
    ...(await import("@kenstack/api/errors")),
    checkQuota: vi.fn(async () => null),
    consumeQuota: vi.fn(),
    recaptcha: vi.fn(),
  };
});

import { pipeline } from "@kenstack/api";
import { resetPasswordPipeline } from "@kenstack/auth/handlers/resetPassword";
import { loginPipeline } from "@kenstack/auth/handlers/login";
import { requireRecentAuthentication } from "@kenstack/auth/reauthentication/server";

const now = new Date("2026-09-21T12:00:00Z");
const authState = {
  state: "authenticated",
  userId: 12,
  email: "person@example.com",
};
const request = new NextRequest("https://example.com/api/auth", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    referer: "https://example.com/account/password?tab=security",
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  mocks.session.mockResolvedValue({
    createdAt: now,
    authorizedUntil: new Date(now.getTime() + 600_000),
    expiresAt: new Date(Date.now() + 86400_000),
    userId: 12,
    impersonatedBy: null,
  });
  mocks.authState.mockResolvedValue(authState);
  mocks.findUser.mockResolvedValue({ id: 12, passwordHash: "existing-hash" });
  mocks.hash.mockResolvedValue("new-hash");
  mocks.compare.mockResolvedValue(true);
  mocks.set.mockReturnValue({
    where: () => ({ returning: async () => [{ id: 12 }] }),
  });
  mocks.update.mockReturnValue({ set: mocks.set });
  mocks.remove.mockReturnValue({ where: async () => undefined });
  mocks.transaction.mockImplementation(async (run) =>
    run({ update: mocks.update, delete: mocks.remove }),
  );
});
afterEach(() => vi.useRealTimers());

describe("shared recent authentication", () => {
  it.each([
    null,
    "not a URL",
    "https://elsewhere.test//unsafe.test",
    "https://example.com/login",
  ])(
    "uses a safe login fallback for an unusable return location: %s",
    async (referer) => {
      mocks.session.mockResolvedValue(undefined);
      await expect(
        requireRecentAuthentication(
          new Request("https://example.com/api/auth", {
            headers: referer ? { referer } : {},
          }),
        ),
      ).rejects.toMatchObject({ redirect: "/login" });
    },
  );
  it("uses login when a stale signed-in request has no safe return path", async () => {
    mocks.session.mockResolvedValue({
      createdAt: new Date(0),
      authorizedUntil: new Date(new Date(0).getTime() + 600_000),
      expiresAt: new Date(Date.now() + 86400_000),
      userId: 12,
      impersonatedBy: null,
    });
    await expect(
      requireRecentAuthentication(new Request("https://example.com/api/auth")),
    ).rejects.toMatchObject({
      code: "reauthentication-required",
      status: 403,
      redirect: "/login",
    });
  });
  it("accepts a recent session for the requested account", async () => {
    await expect(
      requireRecentAuthentication(request, 12),
    ).resolves.toMatchObject({
      userId: 12,
    });
  });
  it.each([
    [undefined, 401],
    [
      {
        createdAt: now,
        authorizedUntil: new Date(now.getTime() + 600_000),
        expiresAt: new Date(Date.now() + 86400_000),
        userId: 13,
        impersonatedBy: null,
      },
      401,
    ],
    [
      {
        createdAt: now,
        authorizedUntil: new Date(now.getTime() + 600_000),
        expiresAt: new Date(Date.now() + 86400_000),
        userId: 12,
        impersonatedBy: 1,
      },
      403,
    ],
  ])(
    "rejects missing, changed, or impersonated sessions",
    async (session, status) => {
      mocks.session.mockResolvedValue(session);
      await expect(
        requireRecentAuthentication(request, 12),
      ).rejects.toMatchObject({
        status,
      });
    },
  );
});

describe("password changes", () => {
  const json = {
    password: "Replacement123",
    confirmPassword: "Replacement123",
  };
  it("returns an expired session to sign-in without changing the password", async () => {
    mocks.session.mockResolvedValue(undefined);
    const response = await resetPasswordPipeline()({ request, json });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "reauthentication-required",
      redirect: "/login?returnTo=%2Faccount%2Fpassword%3Ftab%3Dsecurity",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("requires fresh proof at submission even when a current password is supplied", async () => {
    mocks.session.mockResolvedValue({
      createdAt: new Date(now.getTime() - 660_000),
      authorizedUntil: new Date(
        new Date(now.getTime() - 660_000).getTime() + 600_000,
      ),
      expiresAt: new Date(Date.now() + 86400_000),
      userId: 12,
      impersonatedBy: null,
    });
    const response = await resetPasswordPipeline()({
      request,
      json: { ...json, currentPassword: "Existing123" },
    });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      code: "reauthentication-required",
      redirect: "/account/password?tab=security",
    });
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("sets the password with fresh proof, revokes sessions, and signs back in", async () => {
    const response = await resetPasswordPipeline()({ request, json });
    await expect(response.json()).resolves.toMatchObject({ status: "success" });
    expect(mocks.hash).toHaveBeenCalledWith(json.password, expect.any(Number));
    expect(mocks.set).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: "new-hash" }),
    );
    expect(mocks.remove).toHaveBeenCalledOnce();
    expect(mocks.revalidateTag).toHaveBeenCalledWith("auth-user-sessions:12", {
      expire: 0,
    });
    expect(mocks.login).toHaveBeenCalledWith(12);
  });
});

describe("ordinary password login", () => {
  const json = {
    email: "person@example.com",
    password: "Existing123",
    returnTo: "/account/password",
  };
  it("requires password proof and renews the same account session", async () => {
    const response = await pipeline({ request, json }, loginPipeline({}));
    await expect(response.json()).resolves.toMatchObject({
      status: "success",
      path: "/account/password",
    });
    expect(mocks.login).toHaveBeenCalledWith(12);
  });
  it("does not renew the session when password proof fails", async () => {
    mocks.compare.mockResolvedValue(false);
    const response = await pipeline({ request, json }, loginPipeline({}));
    await expect(response.json()).resolves.toMatchObject({ status: "error" });
    expect(mocks.login).not.toHaveBeenCalled();
  });
});
