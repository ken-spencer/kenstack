import { describe, expect, it } from "vitest";

import { calculateTaxLines } from "@kenstack/payments/taxes/calculate";

const included = {
  id: "a",
  code: "A",
  name: "Tax A",
  ratePercent: "5",
  isIncluded: true,
};

describe("transaction tax allocation", () => {
  it("extracts multiple included rates from one shared base and adds exclusive tax to that base", () => {
    const [line] = calculateTaxLines([
      {
        id: 1,
        amountCents: 11_000,
        taxes: [
          included,
          { ...included, id: "b" },
          { ...included, id: "c", ratePercent: "7", isIncluded: false },
        ],
      },
    ]);

    expect(line).toMatchObject({
      netCents: 10_000,
      taxCents: 1_700,
      totalCents: 11_700,
    });
    expect(line.taxes.map((tax) => tax.amountCents)).toEqual([500, 500, 700]);
  });

  it("retains four decimal percentage places and rounds an exact half cent up", () => {
    const [line] = calculateTaxLines([
      {
        id: 1,
        amountCents: 500_000,
        taxes: [{ ...included, ratePercent: "0.0001", isIncluded: false }],
      },
    ]);

    expect(line).toMatchObject({
      netCents: 500_000,
      taxCents: 1,
      totalCents: 500_001,
    });
    expect(line.taxes[0].ratePercent).toBe("0.0001");
  });

  it("rounds each tax once across lines and breaks remainder ties by numeric immutable ID", () => {
    const lines = calculateTaxLines(
      [10, 2].map((id) => ({
        id,
        amountCents: 1,
        taxes: [{ ...included, ratePercent: "50", isIncluded: false }],
      })),
    );

    expect(lines.map((line) => line.taxCents)).toEqual([0, 1]);
    expect(lines.map((line) => line.totalCents)).toEqual([1, 2]);
    expect(
      calculateTaxLines(
        [2, 10].map((id) => ({
          id,
          amountCents: 1,
          taxes: [{ ...included, ratePercent: "50", isIncluded: false }],
        })),
      ).map((line) => line.taxCents),
    ).toEqual([1, 0]);
  });

  it("allocates a remaining cent to the largest fraction before the smallest ID", () => {
    expect(
      calculateTaxLines([
        {
          id: 1,
          amountCents: 1,
          taxes: [{ ...included, ratePercent: "30", isIncluded: false }],
        },
        {
          id: 2,
          amountCents: 2,
          taxes: [{ ...included, ratePercent: "30", isIncluded: false }],
        },
      ]).map((line) => line.taxCents),
    ).toEqual([0, 1]);
  });

  it("aggregates one tax exactly across lines with different included-tax bases", () => {
    const lines = calculateTaxLines([
      {
        id: 1,
        amountCents: 10_500,
        taxes: [included],
      },
      {
        id: 2,
        amountCents: 11_200,
        taxes: [included, { ...included, id: "b", ratePercent: "7" }],
      },
    ]);

    expect(lines.map((line) => line.netCents)).toEqual([10_000, 10_000]);
    expect(lines.map((line) => line.taxCents)).toEqual([500, 1_200]);
    expect(lines.map((line) => line.totalCents)).toEqual([10_500, 11_200]);
    expect(
      lines
        .flatMap((line) => line.taxes)
        .filter((tax) => tax.id === "a")
        .reduce((sum, tax) => sum + tax.amountCents, 0),
    ).toBe(1_000);
  });

  it("keeps snapshots independent of later catalog edits and reconciles every line", () => {
    const tax = { ...included };
    const lines = calculateTaxLines([
      { id: 1, amountCents: 22500, taxes: [tax] },
      { id: 2, amountCents: 1250, taxes: [tax] },
      { id: 3, amountCents: 17, taxes: [] },
      { id: 4, amountCents: 0, taxes: [tax] },
    ]);
    tax.ratePercent = "20";

    expect(lines[0].taxes[0]).toMatchObject({ ...included, amountCents: 1071 });
    for (const line of lines) {
      expect(
        line.netCents +
          line.taxes.reduce((sum, item) => sum + item.amountCents, 0),
      ).toBe(line.totalCents);
    }
    expect(lines[2]).toEqual({
      id: 3,
      netCents: 17,
      taxCents: 0,
      totalCents: 17,
      taxes: [],
    });
    expect(lines[3].taxCents).toBe(0);
  });

  it("compares exact remainders across different taxable bases", () => {
    const lines = calculateTaxLines([
      { id: 10, amountCents: 10, taxes: [included] },
      {
        id: 2,
        amountCents: 10,
        taxes: [included, { ...included, id: "b", ratePercent: "7" }],
      },
    ]);

    // 10 * 5/105 has a greater remainder than 10 * 5/112 despite its later ID.
    expect(lines.map((line) => line.taxes[0].amountCents)).toEqual([1, 0]);
    expect(lines.map((line) => line.netCents)).toEqual([9, 9]);
    expect(lines.map((line) => line.totalCents)).toEqual([10, 10]);
  });

  it("rejects unsafe or contradictory monetary inputs", () => {
    expect(() =>
      calculateTaxLines([{ id: 1, amountCents: 1.5, taxes: [] }]),
    ).toThrow();
    expect(() =>
      calculateTaxLines([{ id: 1, amountCents: -1, taxes: [] }]),
    ).toThrow();
    expect(() =>
      calculateTaxLines([
        { id: 1, amountCents: 1, taxes: [included, included] },
      ]),
    ).toThrow();
    expect(() =>
      calculateTaxLines(
        [1, 1].map((id) => ({ id, amountCents: 1, taxes: [] })),
      ),
    ).toThrow();
    expect(() =>
      calculateTaxLines([
        {
          id: 1,
          amountCents: 1,
          taxes: [{ ...included, ratePercent: "5.00001" }],
        },
      ]),
    ).toThrow();
    expect(() =>
      calculateTaxLines([
        { id: 1, amountCents: 1, taxes: [{ ...included, ratePercent: "101" }] },
      ]),
    ).toThrow();
    expect(() =>
      calculateTaxLines([
        { id: 1, amountCents: 100, taxes: [included] },
        { id: 2, amountCents: 100, taxes: [{ ...included, ratePercent: "6" }] },
      ]),
    ).toThrow();
    expect(() =>
      calculateTaxLines([
        {
          id: 1,
          amountCents: Number.MAX_SAFE_INTEGER,
          taxes: [{ ...included, ratePercent: "100", isIncluded: false }],
        },
      ]),
    ).toThrow();
  });
});
