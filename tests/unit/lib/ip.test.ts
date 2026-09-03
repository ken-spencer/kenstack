import { afterEach, describe, expect, it, vi } from "vitest";

const { ipAddress } = vi.hoisted(() => ({ ipAddress: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@vercel/functions", () => ({ ipAddress }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import getIp from "@kenstack/lib/ip";

const request = new Request("https://example.com");

describe("getIp", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses the IP supplied by the deployment platform", async () => {
    ipAddress.mockReturnValue("203.0.113.7");

    await expect(getIp(request)).resolves.toBe("203.0.113.7");
  });

  it("uses localhost when development requests have no platform IP", async () => {
    vi.stubEnv("NODE_ENV", "development");
    ipAddress.mockReturnValue(undefined);

    await expect(getIp(request)).resolves.toBe("127.0.0.1");
  });

  it("reads the same platform IP from next/headers without a request", async () => {
    ipAddress.mockReturnValue("203.0.113.7");

    await expect(getIp()).resolves.toBe("203.0.113.7");
    expect(ipAddress).toHaveBeenCalledWith(expect.any(Request));
  });

  it("does not invent an IP outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    ipAddress.mockReturnValue(undefined);

    await expect(getIp(request)).resolves.toBeUndefined();
  });
});
