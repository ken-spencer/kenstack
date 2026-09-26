import { expect, it } from "vitest";
import {
  dateFormat,
  formatDateOnly,
  formatWallTime,
} from "@kenstack/lib/dateFormat";

it("formats instants on the host calendar day by default", () => {
  expect(dateFormat("2026-09-02T03:30:00.000Z")).toBe("Sep 1, 2026, 8:30 PM");
  expect(dateFormat("2026-01-02T03:30:00.000Z")).toBe("Jan 1, 2026, 7:30 PM");
});

it("uses an explicit venue zone when supplied", () => {
  expect(
    dateFormat("2026-09-02T03:30:00.000Z", { timeZone: "America/Toronto" }),
  ).toBe("Sep 1, 2026, 11:30 PM");
});

it("leaves a date-only value on its named calendar day", () => {
  expect(formatDateOnly("2026-09-02")).toBe("Sep 2, 2026");
});

it("formats a wall-clock time from a form or a database time column", () => {
  expect(formatWallTime("19:05")).toBe("7:05 PM");
  expect(formatWallTime("00:30:00")).toBe("12:30 AM");
  expect(formatWallTime("12:00")).toBe("12:00 PM");
  expect(formatWallTime("")).toBeNull();
});
