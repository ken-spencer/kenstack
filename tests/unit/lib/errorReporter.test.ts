import assert from "node:assert/strict";
import { test } from "vitest";

import {
  claimErrorAlert,
  createErrorFingerprint,
  getSafePathname,
  normalizeErrorMessage,
  reportError,
} from "@kenstack/lib/errorReporter";

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

test("removes query strings and fragments from reported paths", () => {
  assert.equal(
    getSafePathname("/reset-password?token=secret#form"),
    "/reset-password",
  );
  assert.equal(getSafePathname("/book-a-stay"), "/book-a-stay");
  assert.equal(getSafePathname(undefined), null);
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
    assert.equal(logs.length, 1);
    const output = JSON.stringify(logs);
    assert.doesNotMatch(output, /postgres:\/\/|credential|private/);
    assert.doesNotMatch(output, /token=secret/);
    assert.doesNotMatch(output, /context-secret|nested-secret/);
    assert.match(output, /<url>/);
    assert.match(output, /"method":"POST"/);
    assert.match(output, /"path":"\/book-a-stay"/);
    assert.match(output, /password=<redacted>/);
    assert.match(
      output,
      /"context":\{"stage":"save","mediaId":42,"endpoint":"<url>","authorization":"<redacted>","nested":"<omitted>"\}/,
    );
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

test("does not claim an alert when the fingerprint is already inhibited", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ result: null });

  try {
    assert.equal(
      await claimErrorAlert(
        { url: "https://example.upstash.io", token: "test-token" },
        "test-key",
      ),
      false,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fails closed when Upstash is unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });

  try {
    await assert.rejects(
      claimErrorAlert(
        { url: "https://example.upstash.io", token: "test-token" },
        "test-key",
      ),
      /Upstash returned HTTP 503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
