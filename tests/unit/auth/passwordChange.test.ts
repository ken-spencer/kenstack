import assert from "node:assert/strict";
import { test } from "vitest";

import {
  hasRecentAuthentication,
  requiresCurrentPassword,
} from "@kenstack/auth/passwordChange";

const now = new Date("2026-07-19T20:00:00.000Z");
const fiveMinutes = 5 * 60 * 1000;

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

test("confirms a stored password once the session is no longer recent", () => {
  assert.equal(
    requiresCurrentPassword(
      { passwordHash: "hash" },
      session({ age: fiveMinutes }),
      now,
    ),
    true,
  );
  assert.equal(
    requiresCurrentPassword({ passwordHash: "hash" }, session(), now),
    false,
  );
});

test("never asks an account without a password to confirm one", () => {
  assert.equal(
    requiresCurrentPassword(
      { passwordHash: null },
      session({ age: fiveMinutes }),
      now,
    ),
    false,
  );
});
