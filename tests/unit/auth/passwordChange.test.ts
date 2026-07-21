import assert from "node:assert/strict";
import { test } from "vitest";

import { hasRecentPasswordAuthentication } from "@kenstack/auth/passwordChange";

const now = new Date("2026-07-19T20:00:00.000Z");
const fiveMinutes = 5 * 60 * 1000;

function session({
  age = 0,
  impersonatedBy = null,
  provider = "password",
}: {
  age?: number;
  impersonatedBy?: number | null;
  provider?: string;
} = {}) {
  return {
    createdAt: new Date(now.getTime() - age),
    impersonatedBy,
    provider,
  };
}

test("accepts a password login inside the five-minute window", () => {
  assert.equal(
    hasRecentPasswordAuthentication(session({ age: fiveMinutes - 1 }), now),
    true,
  );
});

test("requires reauthentication at the five-minute boundary", () => {
  assert.equal(
    hasRecentPasswordAuthentication(session({ age: fiveMinutes }), now),
    false,
  );
});

test("does not accept impersonation as recent authentication", () => {
  assert.equal(
    hasRecentPasswordAuthentication(session({ impersonatedBy: 42 }), now),
    false,
  );
});

test("does not accept a non-password session as recent authentication", () => {
  assert.equal(
    hasRecentPasswordAuthentication(session({ provider: "google" }), now),
    false,
  );
});

test("requires authentication when there is no current session", () => {
  assert.equal(hasRecentPasswordAuthentication(undefined, now), false);
});
