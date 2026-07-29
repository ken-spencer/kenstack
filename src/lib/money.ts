const decimalPattern = /^-?(?:\d+(?:\.\d{0,2})?|\.\d{0,2})$/;

const formatterCache = new Map<string, Intl.NumberFormat>();

export type FormatMoneyOptions = {
  currency?: string;
  locale?: string;
};

// Formats integer cents using the configured Canadian currency defaults.
export function formatMoney(
  cents: number,
  { currency = "CAD", locale = "en-CA" }: FormatMoneyOptions = {},
) {
  assertCents(cents);

  const key = `${locale}:${currency}`;
  let formatter = formatterCache.get(key);

  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    });
    formatterCache.set(key, formatter);
  }

  return formatter.format(cents / 100);
}

// Formats integer cents as editable decimal text without currency decoration.
export function formatDecimalAmount(cents: number | null | undefined) {
  if (cents === null || cents === undefined) {
    return "";
  }

  assertCents(cents);

  const sign = cents < 0 ? "-" : "";
  const absoluteCents = Math.abs(cents);
  const dollars = Math.floor(absoluteCents / 100);
  const remainder = String(absoluteCents % 100).padStart(2, "0");

  return `${sign}${dollars}.${remainder}`;
}

/**
 * Returns cents for complete input, null for an editable intermediate value,
 * and undefined for input that should be rejected.
 */
export function parseDecimalAmount(value: string): number | null | undefined {
  if (value === "" || value === "-" || value === "." || value === "-.") {
    return null;
  }

  if (!decimalPattern.test(value)) {
    return undefined;
  }

  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [dollarsInput = "0", centsInput = ""] = unsigned.split(".");
  const dollars = Number(dollarsInput || "0");
  const cents = Number(centsInput.padEnd(2, "0") || "0");
  const result = dollars * 100 + cents;
  const signedResult = negative ? -result : result;

  return Number.isSafeInteger(signedResult) ? signedResult : undefined;
}

/**
 * Settles a cash total to the smallest coin still in circulation. Canada
 * withdrew the one-cent coin, so the default increment is five cents.
 *
 * Only the final cash total rounds: line prices, tax allocation, and non-cash
 * totals stay exact to the cent.
 */
export function roundCashCents(cents: number, incrementCents = 5) {
  assertCents(cents);
  assertCents(incrementCents);

  if (incrementCents < 1) {
    throw new RangeError("Cash rounding needs a positive increment.");
  }

  return Math.round(cents / incrementCents) * incrementCents;
}

// Rejects fractional or unsafe integer-cent values at money helper boundaries.
function assertCents(cents: number) {
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError("Money must be represented as safe integer cents.");
  }
}
