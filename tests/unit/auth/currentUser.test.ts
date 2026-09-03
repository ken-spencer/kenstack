import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cacheResults: new Map<string, unknown>(),
  cookies: vi.fn(),
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
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
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
} from "@kenstack/auth/server/user";

function selectResult(roles: string[] = []) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        avatar: null,
        email: "person@example.com",
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
});
