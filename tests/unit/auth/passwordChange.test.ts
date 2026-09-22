import assert from "node:assert/strict";
import { test } from "vitest";

import {
  getAuthenticationRemainingMs,
  hasRecentAuthentication,
} from "@kenstack/auth/reauthentication";

const now = new Date("2026-07-19T20:00:00.000Z");
const fiveMinutes = 5 * 60 * 1000;

test("uses the remaining session age, never a fresh five-minute allowance", () => {
  assert.equal(
    getAuthenticationRemainingMs(session({ age: 280_000 }), now),
    20_000,
  );
  assert.equal(
    getAuthenticationRemainingMs(session({ age: fiveMinutes }), now),
    0,
  );
  assert.equal(
    getAuthenticationRemainingMs(session({ age: 360_000 }), now),
    -60_000,
  );
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
    impersonatedBy,
  };
}

test("accepts recent non-impersonated authentication", () => {
  assert.equal(
    hasRecentAuthentication(session({ age: fiveMinutes - 1 }), now),
    true,
  );
});

test("requires reauthentication at the five-minute boundary", () => {
  assert.equal(
    hasRecentAuthentication(session({ age: fiveMinutes }), now),
    false,
  );
});

test("does not accept impersonation as recent authentication", () => {
  assert.equal(
    hasRecentAuthentication(session({ impersonatedBy: 42 }), now),
    false,
  );
});

test("requires authentication when there is no current session", () => {
  assert.equal(hasRecentAuthentication(undefined, now), false);
});

test("allows one minute for an in-flight write after the browser deadline", () => {
  assert.equal(
    hasRecentAuthentication(session({ age: fiveMinutes }), now),
    false,
  );
  assert.equal(
    hasRecentAuthentication(session({ age: fiveMinutes }), now, 60_000),
    true,
  );
  assert.equal(
    hasRecentAuthentication(
      session({ age: fiveMinutes + 60_000 }),
      now,
      60_000,
    ),
    false,
  );
});
