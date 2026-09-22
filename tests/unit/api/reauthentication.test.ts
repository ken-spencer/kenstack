import { afterEach, expect, it, vi } from "vitest";
import fetcher from "@kenstack/api/fetcher";

afterEach(() => vi.unstubAllGlobals());

it.each(["reset-password", "email-change"])(
  "follows the server redirect for %s without resubmitting",
  async (action) => {
    const location = {
      pathname: "/account/profile",
      search: "?tab=security",
      hash: "#email",
      href: "",
    };
    vi.stubGlobal("window", { location });
    const request = vi.fn(async () =>
      Response.json(
        {
          status: "error",
          code: "reauthentication-required",
          redirect:
            "/login?returnTo=%2Faccount%2Fprofile%3Ftab%3Dsecurity%23email",
        },
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", request);
    await expect(
      fetcher("/api/auth", { action, password: "private-new-password" }),
    ).resolves.toEqual({ status: "error" });
    expect(location.href).toBe(
      "/login?returnTo=%2Faccount%2Fprofile%3Ftab%3Dsecurity%23email",
    );
    expect(location.href).not.toContain("private-new-password");
    expect(request).toHaveBeenCalledOnce();
  },
);

it("returns a domain error unchanged when the server supplies no redirect", async () => {
  const location = { href: "" };
  vi.stubGlobal("window", { location });
  const result = {
    status: "error",
    code: "reauthentication-required",
    message: "Fresh proof required",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(result, { status: 403 })),
  );
  await expect(fetcher("/api/auth")).resolves.toEqual(result);
  expect(location.href).toBe("");
});
