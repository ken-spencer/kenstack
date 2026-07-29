import { describe, expect, it } from "vitest";

import {
  formatDecimalAmount,
  formatMoney,
  parseDecimalAmount,
  roundCashCents,
} from "../../../src/lib/money";

describe("money", () => {
  it.each([
    ["12.34", 1234],
    ["12", 1200],
    ["12.", 1200],
    [".5", 50],
    ["0.05", 5],
    ["-1.25", -125],
  ])("parses %s directly into integer cents", (input, expected) => {
    expect(parseDecimalAmount(input)).toBe(expected);
  });

  it.each(["", "-", ".", "-."])(
    "accepts incomplete input %s without producing cents",
    (input) => {
      expect(parseDecimalAmount(input)).toBeNull();
    },
  );

  it.each(["1.234", "one", "1,000.00"])("rejects invalid input %s", (input) => {
    expect(parseDecimalAmount(input)).toBeUndefined();
  });

  it("formats cents for editing without floating-point arithmetic", () => {
    expect(formatDecimalAmount(1200)).toBe("12.00");
    expect(formatDecimalAmount(5)).toBe("0.05");
    expect(formatDecimalAmount(-105)).toBe("-1.05");
    expect(formatDecimalAmount(null)).toBe("");
  });

  it("formats cents as Canadian dollars", () => {
    expect(formatMoney(1234)).toBe("$12.34");
    expect(formatMoney(1200)).toBe("$12.00");
  });
});

describe("cash rounding", () => {
  it.each([
    [1234, 1235],
    [1231, 1230],
    [1232, 1230],
    [1233, 1235],
    [1235, 1235],
    [0, 0],
  ])("settles %d cents to the nearest nickel", (input, expected) => {
    expect(roundCashCents(input)).toBe(expected);
  });

  it("rejects a non-integer amount rather than rounding it twice", () => {
    expect(() => roundCashCents(12.34)).toThrow(TypeError);
  });

  it("accepts another increment for a currency with a different smallest coin", () => {
    expect(roundCashCents(1234, 10)).toBe(1230);
    expect(roundCashCents(1236, 10)).toBe(1240);
    expect(roundCashCents(1234, 1)).toBe(1234);
    expect(() => roundCashCents(1234, 0)).toThrow(RangeError);
  });
});
