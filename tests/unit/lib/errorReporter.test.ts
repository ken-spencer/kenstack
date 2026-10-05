import assert from "node:assert/strict";
import { test, vi } from "vitest";

import {
  claimErrorAlert,
  createErrorFingerprint,
  normalizeErrorMessage,
  onRequestError,
  reportError,
} from "@kenstack/lib/errorReporter";

const mailer = vi.hoisted(() =>
  vi.fn<typeof import("@kenstack/lib/mailer").default>(async () => ({
    status: "sent",
    messageId: "test-message",
  })),
);
vi.mock("@kenstack/lib/mailer", () => ({
  default: mailer,
  errorReportKind: "errorReport",
}));

test("normalizes changing database details before fingerprinting", async () => {
  const first = Object.assign(
    new Error(
      'connection failed for database "site_123" at 2026-07-19T20:01:02Z',
    ),
    { code: "ECONNREFUSED" },
  );
  const second = Object.assign(
    new Error(
      'connection failed for database "site_987" at 2026-07-20T09:08:07Z',
    ),
    { code: "ECONNREFUSED" },
  );

  assert.equal(
    await createErrorFingerprint(first),
    await createErrorFingerprint(second),
  );
});

test("uses the deepest Error cause for the fingerprint", async () => {
  const root = Object.assign(new Error("database unavailable on node 42"), {
    code: "ECONNREFUSED",
  });

  assert.equal(
    await createErrorFingerprint(new Error("Failed query", { cause: root })),
    await createErrorFingerprint(root),
  );
});

test("normalizes sensitive and changing message values", () => {
  assert.equal(
    normalizeErrorMessage(
      'Request 987 for "record-42" from editor@example.com at 192.0.2.1 failed at 2026-07-19T20:01:02Z: https://example.com/private?token=x',
    ),
    "Request <number> for <value> from <email> at <ip> failed at <time>: <url>",
  );
});

test("redacts connection URLs and credential-shaped values", () => {
  assert.equal(
    normalizeErrorMessage(
      'Database postgres://user:credential@db.example.com/site failed with password=private authorization: Bearer opaque token="private"',
    ),
    "Database <url> failed with password=<redacted> authorization=<redacted> token=<redacted>",
  );
});

test("logs a redacted event without contacting Upstash when monitoring is disabled", async () => {
  const monitoringEmail = process.env.MONITORING_EMAIL;
  const originalFetch = globalThis.fetch;
  // eslint-disable-next-line no-console -- The test restores the reporter's output boundary.
  const originalConsoleError = console.error;
  const logs: unknown[][] = [];
  let fetched = false;

  delete process.env.MONITORING_EMAIL;
  globalThis.fetch = async () => {
    fetched = true;
    throw new Error("Unexpected fetch");
  };
  // eslint-disable-next-line no-console -- Capture the reporter's structured output.
  console.error = (...args: unknown[]) => {
    logs.push(args);
  };

  try {
    await reportError(
      new Error(
        "Database postgres://user:credential@db.example.com/site failed with password=private",
      ),
      {
        source: "test",
        context: {
          stage: "save",
          mediaId: 42,
          endpoint: "https://example.com/private?token=context-secret",
          authorization: "Bearer context-secret",
          nested: { token: "nested-secret" },
        },
        request: new Request("https://example.com/book-a-stay?token=secret", {
          method: "POST",
        }),
      },
    );

    assert.equal(fetched, false);
    const output = JSON.stringify(logs);
    assert.doesNotMatch(output, /postgres:\/\/|credential|private/);
    assert.doesNotMatch(output, /token=secret/);
    assert.doesNotMatch(output, /context-secret|nested-secret/);
    assert.match(output, /<url>/);
    assert.match(output, /"method":"POST"/);
    assert.match(output, /"path":"\/book-a-stay"/);
    assert.match(output, /password=<redacted>/);
  } finally {
    if (monitoringEmail === undefined) {
      delete process.env.MONITORING_EMAIL;
    } else {
      process.env.MONITORING_EMAIL = monitoringEmail;
    }
    globalThis.fetch = originalFetch;
    // eslint-disable-next-line no-console -- Restore the output boundary after the test.
    console.error = originalConsoleError;
  }
});

test("reads Vercel KV Upstash credentials from the function environment", async () => {
  const variableNames = [
    "FROM_ADDRESS",
    "MONITORING_EMAIL",
    "UPSTASH_REDIS_REST_TOKEN",
    "UPSTASH_REDIS_REST_URL",
    "KV_REST_API_TOKEN",
    "KV_REST_API_URL",
  ] as const;
  const originalVariables = Object.fromEntries(
    variableNames.map((name) => [name, process.env[name]]),
  );
  const originalFetch = globalThis.fetch;
  // eslint-disable-next-line no-console -- The test restores the reporter's output boundary.
  const originalConsoleError = console.error;
  let requestUrl = "";
  let authorization = "";

  process.env.FROM_ADDRESS = "alerts@example.com";
  process.env.MONITORING_EMAIL = "operator@example.com";
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  process.env.KV_REST_API_URL = "https://vercel-kv.example.com";
  process.env.KV_REST_API_TOKEN = "vercel-kv-token";
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input);
    authorization = new Headers(init?.headers).get("authorization") ?? "";
    return Response.json({ result: null });
  };
  // eslint-disable-next-line no-console -- Suppress the intentional structured test report.
  console.error = () => undefined;

  try {
    await reportError(new Error("Cleanup failed"), {
      source: "media.objectCleanup",
    });

    assert.equal(requestUrl, "https://vercel-kv.example.com");
    assert.equal(authorization, "Bearer vercel-kv-token");
  } finally {
    for (const name of variableNames) {
      const value = originalVariables[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    globalThis.fetch = originalFetch;
    // eslint-disable-next-line no-console -- Restore the output boundary after the test.
    console.error = originalConsoleError;
  }
});

test("claims an alert with one atomic fifteen-minute Upstash command", async () => {
  const originalFetch = globalThis.fetch;
  let command: unknown;
  globalThis.fetch = async (_input, init) => {
    command = JSON.parse(String(init?.body));
    return Response.json({ result: "OK" });
  };

  try {
    assert.equal(
      await claimErrorAlert(
        { url: "https://example.upstash.io/", token: "test-token" },
        "test-key",
      ),
      true,
    );
    assert.deepEqual(command, ["SET", "test-key", "1", "NX", "EX", 900]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test.each([
  ["emails every error when Redis is not configured", undefined, 1],
  ["emails once per window when Redis is configured", { result: null }, 0],
  ["emails when Redis cannot be reached", new Error("offline"), 1],
] as const)("%s", async (_name, redis, emails) => {
  vi.stubEnv("FROM_ADDRESS", "alerts@example.com");
  vi.stubEnv("MONITORING_EMAIL", "operator@example.com");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv(
    "UPSTASH_REDIS_REST_URL",
    redis ? "https://example.upstash.io" : "",
  );
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", redis ? "test-token" : "");
  vi.stubGlobal("fetch", async () => {
    if (redis instanceof Error) {
      throw redis;
    }
    return Response.json(redis);
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mailer.mockClear();

  try {
    await reportError(new Error("Cleanup failed"), { source: "test" });
    assert.equal(mailer.mock.calls.length, emails);
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});

test("logs but never emails from a development server", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("FROM_ADDRESS", "alerts@example.com");
  vi.stubEnv("MONITORING_EMAIL", "operator@example.com");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  const logs = vi.spyOn(console, "error").mockImplementation(() => undefined);
  mailer.mockClear();

  try {
    await reportError(new Error("Cleanup failed"), { source: "test" });
    assert.equal(mailer.mock.calls.length, 0);
    assert.equal(logs.mock.calls.length, 1);
  } finally {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  }
});

test("emails the actual page and complete error frames without the SQL preamble", async () => {
  vi.stubEnv("FROM_ADDRESS", "alerts@example.com");
  vi.stubEnv("MONITORING_EMAIL", "operator@example.com");
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined);
  vi.stubEnv("VERCEL_PROJECT_ID", undefined);
  vi.stubEnv("npm_package_name", "civictheatre.ca");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  const logs = vi.spyOn(console, "error").mockImplementation(() => undefined);
  mailer.mockClear();

  const cause = Object.assign(
    new TypeError("Expected a string; received Date at parameter 42"),
    {
      code: "ERR_INVALID_ARG_TYPE",
    },
  );
  cause.stack = [
    `${cause.name}: ${cause.message}`,
    "    at encode (node:buffer:12:3)",
    ...Array.from(
      { length: 12 },
      (_, index) => `    at execute (/app/db/driver.ts:${index + 1}:4)`,
    ),
    "    at request (https://example.com/private?token=stack-secret)",
  ].join("\n");
  const error = new Error(
    `Failed query:\n${"select jsonb_build_object('private-value')\n".repeat(12)}`,
    { cause },
  );
  error.stack = `${error.name}: ${error.message}\n    at loadUsers (/app/src/list/server.ts:142:8)\n    at renderPage (/app/src/admin/Page.tsx:30:2)`;

  try {
    await onRequestError(
      error,
      {
        method: "GET",
        path: "/admin/users?token=request-secret#details",
        headers: {},
      },
      {
        routerKind: "App Router",
        routePath: "/admin/[...admin]",
        routeType: "render",
        revalidateReason: undefined,
      },
    );

    assert.equal(mailer.mock.calls.length, 1);
    const email = mailer.mock.calls[0][0];
    assert.match(email.html, /civictheatre\.ca/);
    assert.match(email.html, /\/admin\/users/);
    assert.match(email.html, /ERR_INVALID_ARG_TYPE/);
    assert.match(email.html, /received Date at parameter 42/);
    assert.match(email.html, /at encode \(node:buffer:12:3\)/);
    assert.match(email.html, /at execute \(\/app\/db\/driver.ts:12:4\)/);
    assert.match(
      email.html,
      /at loadUsers \(\/app\/src\/list\/server.ts:142:8\)/,
    );
    assert.match(
      email.html,
      /at renderPage \(\/app\/src\/admin\/Page.tsx:30:2\)/,
    );
    assert.match(email.html, /[a-f0-9]{64}/);
    assert.doesNotMatch(
      email.html,
      /jsonb_build_object|private-value|stack-secret|request-secret|\.\.\.admin/,
    );
    assert.doesNotMatch(
      JSON.stringify(logs.mock.calls),
      /private-value|stack-secret|request-secret/,
    );
  } finally {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  }
});
