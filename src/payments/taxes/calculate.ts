// Shared tax allocation for host checkout quotes and immutable purchase snapshots.

export function calculateTaxLines(
  lines: {
    id: number;
    amountCents: number;
    taxes: {
      id: string;
      code: string;
      name: string;
      ratePercent: string;
      isIncluded: boolean;
    }[];
  }[],
) {
  const scale = BigInt(1_000_000);
  const zero = BigInt(0);
  const one = BigInt(1);
  const ids = new Set<number>();
  const groups = new Map<
    string,
    {
      ratePercent: string;
      isIncluded: boolean;
      numerator: bigint;
      denominator: bigint;
      allocations: {
        id: number;
        numerator: bigint;
        denominator: bigint;
        snapshot: { amountCents: number };
      }[];
    }
  >();

  const snapshots = lines.map((line) => {
    if (
      !Number.isSafeInteger(line.id) ||
      ids.has(line.id) ||
      !Number.isSafeInteger(line.amountCents) ||
      line.amountCents < 0
    ) {
      throw new RangeError(
        "Tax lines require unique integer IDs and non-negative safe integer cents.",
      );
    }
    ids.add(line.id);

    const taxIds = new Set<string>();
    const rates = line.taxes.map((tax) => {
      if (taxIds.has(tax.id) || !/^\d+(?:\.\d{1,4})?$/.test(tax.ratePercent)) {
        throw new RangeError(
          "Tax rates require unique IDs and a percentage with at most four decimal places.",
        );
      }
      taxIds.add(tax.id);
      const [whole, fraction = ""] = tax.ratePercent.split(".");
      const rate =
        BigInt(whole) * BigInt(10_000) + BigInt(fraction.padEnd(4, "0"));
      if (rate > scale) {
        throw new RangeError("Tax percentages must not exceed 100%.");
      }
      return { tax, rate };
    });
    const denominator =
      scale +
      rates.reduce(
        (total, { tax, rate }) => total + (tax.isIncluded ? rate : zero),
        zero,
      );

    return {
      id: line.id,
      amountCents: line.amountCents,
      taxes: rates.map(({ tax, rate }) => {
        const numerator = BigInt(line.amountCents) * rate;
        const snapshot = {
          id: tax.id,
          code: tax.code,
          name: tax.name,
          ratePercent: tax.ratePercent,
          isIncluded: tax.isIncluded,
          amountCents: Number(numerator / denominator),
        };
        let group = groups.get(tax.id);
        if (!group) {
          group = {
            ratePercent: tax.ratePercent,
            isIncluded: tax.isIncluded,
            numerator: zero,
            denominator: one,
            allocations: [],
          };
          groups.set(tax.id, group);
        }
        if (
          group.ratePercent !== tax.ratePercent ||
          group.isIncluded !== tax.isIncluded
        ) {
          throw new Error(
            "A tax ID must have the same rate and treatment throughout a transaction.",
          );
        }
        group.numerator =
          group.numerator * denominator + numerator * group.denominator;
        group.denominator *= denominator;
        // Reduce each sum so a large cart does not grow an unnecessary common denominator.
        let divisor = group.numerator;
        let remainder = group.denominator;
        while (remainder !== zero) {
          [divisor, remainder] = [remainder, divisor % remainder];
        }
        group.numerator /= divisor;
        group.denominator /= divisor;
        group.allocations.push({
          id: line.id,
          numerator,
          denominator,
          snapshot,
        });
        return snapshot;
      }),
    };
  });

  for (const group of groups.values()) {
    let remaining =
      (group.numerator * BigInt(2) + group.denominator) /
        (group.denominator * BigInt(2)) -
      group.allocations.reduce(
        (total, { snapshot }) => total + BigInt(snapshot.amountCents),
        zero,
      );
    group.allocations.sort((left, right) => {
      const difference =
        (right.numerator % right.denominator) * left.denominator -
        (left.numerator % left.denominator) * right.denominator;
      return difference < zero
        ? -1
        : difference > zero
          ? 1
          : left.id - right.id;
    });
    for (const { snapshot } of group.allocations) {
      if (remaining === zero) break;
      snapshot.amountCents += 1;
      remaining -= one;
    }
  }

  return snapshots.map(({ id, amountCents, taxes }) => {
    const includedCents = taxes.reduce(
      (total, tax) => total + (tax.isIncluded ? tax.amountCents : 0),
      0,
    );
    const taxCents = taxes.reduce((total, tax) => total + tax.amountCents, 0);
    const totalCents = amountCents - includedCents + taxCents;
    if (!Number.isSafeInteger(taxCents) || !Number.isSafeInteger(totalCents)) {
      throw new RangeError("Tax totals must be safe integer cents.");
    }
    return {
      id,
      netCents: amountCents - includedCents,
      taxCents,
      totalCents,
      taxes,
    };
  });
}
