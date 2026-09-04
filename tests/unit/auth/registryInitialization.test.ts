import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@app/db", () => ({ db: {} }));
vi.mock("@app/modules", () => ({
  get modules() {
    throw new ReferenceError("The host module registry is still initializing");
  },
}));
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

it("loads auth while the host module registry is still initializing", async () => {
  await expect(import("@kenstack/auth/server/user")).resolves.toMatchObject({
    getCurrentUser: expect.any(Function),
    getCurrentSession: expect.any(Function),
  });
});
