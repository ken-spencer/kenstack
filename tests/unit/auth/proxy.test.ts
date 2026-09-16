import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxyAuth } from "@kenstack/auth/proxy";

describe("page authentication proxy", () => {
  it.each([undefined, "sessionId="])(
    "redirects a missing or empty session cookie with the page query preserved: %s",
    (cookie) => {
      const response = proxyAuth(
        new NextRequest(
          "https://civic.example/admin/movies?tag=a&tag=b&search=Arrival%20%26%20Dune&_rsc=flight",
          { headers: cookie ? { cookie } : {} },
        ),
      );
      const location = new URL(response.headers.get("location")!);
      expect(response.status).toBe(307);
      expect(location.origin + location.pathname).toBe(
        "https://civic.example/login",
      );
      expect(location.searchParams.get("returnTo")).toBe(
        "/admin/movies?tag=a&tag=b&search=Arrival+%26+Dune",
      );
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.has("set-cookie")).toBe(false);
    },
  );

  it("passes any nonempty cookie to server auth and overwrites request-path metadata", () => {
    const response = proxyAuth(
      new NextRequest("https://civic.example/admin/users?page=2&_rsc=flight", {
        headers: {
          cookie: "sessionId=unverified-token",
          "x-pathname": "/wrong-page",
          "x-search": "?wrong=query",
          "accept-language": "en-CA",
        },
      }),
    );
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
      "/admin/users",
    );
    expect(response.headers.get("x-middleware-request-x-search")).toBe(
      "?page=2",
    );
    expect(response.headers.get("x-middleware-request-accept-language")).toBe(
      "en-CA",
    );
    expect(response.headers.has("x-pathname")).toBe(false);
    expect(response.headers.has("x-search")).toBe(false);
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("ignores supplied request-path headers when redirecting", () => {
    const response = proxyAuth(
      new NextRequest("https://civic.example/pos", {
        headers: { "x-pathname": "/wrong-page", "x-search": "?wrong=query" },
      }),
    );
    expect(response.headers.get("location")).toBe(
      "https://civic.example/login?returnTo=%2Fpos",
    );
  });

  it("clears a supplied query header when the URL has no query", () => {
    const response = proxyAuth(
      new NextRequest("https://civic.example/pos", {
        headers: {
          cookie: "sessionId=unverified-token",
          "x-search": "?wrong=query",
        },
      }),
    );
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe(
      "/pos",
    );
    expect(response.headers.get("x-middleware-request-x-search")).toBe("");
  });

  it("also redirects HEAD page requests", () => {
    const response = proxyAuth(
      new NextRequest("https://civic.example/pos", { method: "HEAD" }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://civic.example/login?returnTo=%2Fpos",
    );
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "leaves %s requests to the route's own authorization",
    (method) => {
      const response = proxyAuth(
        new NextRequest("https://civic.example/admin/users", { method }),
      );
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.has("location")).toBe(false);
      expect(response.headers.has("x-middleware-override-headers")).toBe(false);
    },
  );

  it.each(["/api", "/api/admin", "/api/auth"])(
    "does not redirect an API request to %s",
    (path) => {
      const response = proxyAuth(
        new NextRequest(`https://civic.example${path}`),
      );
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.has("location")).toBe(false);
      expect(response.headers.has("x-middleware-override-headers")).toBe(false);
    },
  );
});
