import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheResults: new Map<string, unknown>(),
  cacheTag: vi.fn(),
  cookies: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
  select: vi.fn(),
}));

vi.mock("react", () => ({
  cache: (operation: (...args: unknown[]) => unknown) => {
    return (...args: unknown[]) => {
      const key = JSON.stringify(args);
      if (!mocks.cacheResults.has(key)) {
        mocks.cacheResults.set(key, operation(...args));
      }
      return mocks.cacheResults.get(key);
    };
  },
}));
vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({ db: { select: mocks.select } }));
vi.mock("@app/modules", () => ({
  modules: { users: { admin: { table: {} } } },
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: mocks.cacheTag }));
vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
  headers: mocks.headers,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("drizzle-orm", () => ({
  and: vi.fn(() => ({})),
  eq: vi.fn(() => ({})),
  gt: vi.fn(() => ({})),
  isNull: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
}));
vi.mock("@kenstack/auth/server/token", () => ({
  hashToken: vi.fn(() => "token-hash"),
}));
vi.mock("@kenstack/db/queries/media", () => ({
  selectMediaSubquery: vi.fn(() => ({})),
}));
vi.mock("@kenstack/db/tables/sessions", () => ({ sessions: {} }));

import {
  getCurrentUser,
  getFreshCurrentUser,
  requireUser,
} from "@kenstack/auth/server/user";

function selectResult(roles: string[] = []) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        avatar: null,
        email: "person@example.com",
        expiresAt: new Date(Date.now() + 60_000),
        familyName: "Example",
        givenName: "Person",
        id: 12,
        impersonatedBy: null,
        middleName: "",
        roles,
      },
    ]),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return query;
}

describe("current-user loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheResults.clear();
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "session-token" })),
    });
    mocks.select.mockImplementation(() => selectResult());
  });

  it("shares ordinary session reads while fresh reads bypass the cache", async () => {
    await getCurrentUser();
    await getCurrentUser();
    expect(mocks.select).toHaveBeenCalledOnce();

    await getFreshCurrentUser();
    expect(mocks.select).toHaveBeenCalledTimes(2);

    await getCurrentUser();
    expect(mocks.select).toHaveBeenCalledTimes(2);
  });

  it("grants only roles registered by the host", async () => {
    mocks.select.mockImplementation(() =>
      selectResult(["retired-role", "admin", "constructor", "toString"]),
    );

    expect((await getCurrentUser())?.roles).toEqual(["admin"]);
  });

  it("tags the cached session read by session and by user", async () => {
    const user = await getCurrentUser();

    expect(user?.id).toBe(12);
    expect(mocks.cacheTag).toHaveBeenCalledWith("auth-session:token-hash");
    expect(mocks.cacheTag).toHaveBeenCalledWith("auth-user-sessions:12");
    expect(mocks.cacheTag).toHaveBeenCalledWith("admin-load:users:12");
    expect(mocks.select).toHaveBeenCalledTimes(1);
  });
});

describe("required-user redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheResults.clear();
    mocks.cookies.mockResolvedValue({ get: vi.fn() });
    mocks.headers.mockResolvedValue(
      new Headers({
        "x-pathname": "/admin/movies",
        "x-search": "?search=Arrival&page=2",
      }),
    );
    mocks.select.mockImplementation(() => selectResult());
  });

  it("preserves the proxy destination when signed out", async () => {
    await expect(requireUser("admin")).rejects.toThrow(
      "REDIRECT /login?returnTo=%2Fadmin%2Fmovies%3Fsearch%3DArrival%26page%3D2",
    );
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("uses an explicit destination without reading headers", async () => {
    await expect(
      requireUser("authenticated", "/account?tab=orders"),
    ).rejects.toThrow("REDIRECT /login?returnTo=%2Faccount%3Ftab%3Dorders");
    expect(mocks.headers).not.toHaveBeenCalled();
  });

  it("keeps plain login when neither destination is available", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    await expect(requireUser()).rejects.toThrow("REDIRECT /login");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it.each([
    "https://elsewhere.example/",
    "//elsewhere.example/",
    "/\\elsewhere.example",
    "/login",
    "",
  ])(
    "rejects unsafe or empty explicit destinations without falling back to the header: %s",
    async (returnTo) => {
      await expect(requireUser("authenticated", returnTo)).rejects.toThrow(
        "REDIRECT /login",
      );
      expect(mocks.redirect).toHaveBeenCalledWith("/login");
      expect(mocks.headers).not.toHaveBeenCalled();
    },
  );

  it("validates header destinations on requests that did not pass through the proxy", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ "x-pathname": "//elsewhere.example" }),
    );
    await expect(requireUser()).rejects.toThrow("REDIRECT /login");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("uses the pathname when no query header is available", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-pathname": "/pos" }));
    await expect(requireUser()).rejects.toThrow(
      "REDIRECT /login?returnTo=%2Fpos",
    );
  });

  it("does not use a query header without a pathname", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "x-search": "?tab=orders" }));
    await expect(requireUser()).rejects.toThrow("REDIRECT /login");
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
  });

  it("preserves the destination when a cookie has no valid session", async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: "expired-token" }),
    });
    const query = selectResult();
    query.limit.mockResolvedValue([]);
    mocks.select.mockReturnValue(query);
    await expect(requireUser("admin")).rejects.toThrow(
      "REDIRECT /login?returnTo=%2Fadmin%2Fmovies%3Fsearch%3DArrival%26page%3D2",
    );
  });

  it("does not send an authenticated user back to a forbidden destination", async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: "session-token" }),
    });
    await expect(requireUser("admin", "/admin/movies")).rejects.toThrow(
      "REDIRECT /login",
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.headers).not.toHaveBeenCalled();
  });

  it("shares the session lookup across destinations and skips headers for authorized users", async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: "session-token" }),
    });
    mocks.select.mockImplementation(() => selectResult(["admin"]));
    expect((await requireUser("admin", "/admin/movies")).id).toBe(12);
    expect((await requireUser("admin", "/admin/users")).id).toBe(12);
    expect((await requireUser("admin")).id).toBe(12);
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.headers).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
