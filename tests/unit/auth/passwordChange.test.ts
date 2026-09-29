import assert from "node:assert/strict";
import { afterEach, beforeEach, test, vi } from "vitest";

import { hasRecentAuthentication } from "@kenstack/auth/reauthentication";

const now = new Date("2026-07-19T20:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

function session({
  age = 0,
  impersonatedBy = null,
}: {
  age?: number;
  impersonatedBy?: number | null;
} = {}) {
  return {
    createdAt: new Date(now.getTime() - age),
    authorizedUntil: new Date(now.getTime() - age + 600_000),
    expiresAt: new Date(now.getTime() + 86400_000),
    impersonatedBy,
  };
}

test("accepts recent non-impersonated authentication", () => {
  assert.equal(hasRecentAuthentication(session({ age: 600_000 - 1 })), true);
});

test("requires reauthentication at the ten-minute boundary", () => {
  assert.equal(hasRecentAuthentication(session({ age: 600_000 })), false);
});

test("does not accept impersonation as recent authentication", () => {
  assert.equal(hasRecentAuthentication(session({ impersonatedBy: 42 })), false);
});

test("requires authentication when there is no current session", () => {
  assert.equal(hasRecentAuthentication(undefined), false);
});

test("an extension grants time without changing authentication time", () => {
  const original = session({ age: 900_000 });
  assert.equal(hasRecentAuthentication(original), false);
  assert.equal(
    hasRecentAuthentication({
      ...original,
      authorizedUntil: new Date(now.getTime() + 10_000),
    }),
    true,
  );
  assert.equal(
    hasRecentAuthentication({ ...original, authorizedUntil: now }),
    false,
  );
});
