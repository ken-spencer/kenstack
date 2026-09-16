import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

const { default: siteOrigin } = await import("@kenstack/lib/siteOrigin");

const request = new Request("http://localhost:3000/api/auth", {
  headers: { host: "civic.localhost:3000" },
});

describe("siteOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses a configured site URL before anything else", async () => {
    vi.stubEnv("SITE_URL", "https://www.example.com/");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "example.vercel.app");

    await expect(siteOrigin(request)).resolves.toBe("https://www.example.com");
  });

  it("uses the Vercel production domain in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "www.example.com");
    vi.stubEnv("VERCEL_URL", "deploy-abc123.vercel.app");

    await expect(siteOrigin(request)).resolves.toBe("https://www.example.com");
  });

  it("uses the deployment URL in a preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "deploy-abc123.vercel.app");

    await expect(siteOrigin(request)).resolves.toBe(
      "https://deploy-abc123.vercel.app",
    );
  });

  it("falls back to the host the browser addressed", async () => {
    await expect(siteOrigin(request)).resolves.toBe(
      "http://civic.localhost:3000",
    );
  });

  it("reads the render-path headers when no request is given", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({ host: "www.example.com", "x-forwarded-proto": "https" }),
    );

    await expect(siteOrigin()).resolves.toBe("https://www.example.com");
  });
});
