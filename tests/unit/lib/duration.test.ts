import { describe, expect, it } from "vitest";

import { type DurationString, parseDuration } from "@kenstack/lib/duration";

describe("parseDuration", () => {
  it.each([
    ["1 minute", 60 * 1000],
    ["2 minutes", 2 * 60 * 1000],
    ["1 hour", 60 * 60 * 1000],
    ["24 hour", 24 * 60 * 60 * 1000],
    ["24 hours", 24 * 60 * 60 * 1000],
    ["1 day", 24 * 60 * 60 * 1000],
    ["2 days", 2 * 24 * 60 * 60 * 1000],
    ["1 week", 7 * 24 * 60 * 60 * 1000],
    ["2 weeks", 2 * 7 * 24 * 60 * 60 * 1000],
    ["1 year", 365 * 24 * 60 * 60 * 1000],
    ["2 years", 2 * 365 * 24 * 60 * 60 * 1000],
  ] satisfies Array<[DurationString, number]>)(
    "parses %s",
    (duration, expected) => {
      expect(parseDuration(duration)).toBe(expected);
    },
  );

  it.each(["0 minutes", "-1 hour", "1.5 hours", "one day", "1 month"])(
    "rejects %s at runtime",
    (duration) => {
      expect(() => parseDuration(duration as DurationString)).toThrow(
        "Invalid duration",
      );
    },
  );
});
