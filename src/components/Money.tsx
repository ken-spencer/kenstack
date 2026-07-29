import { formatMoney, type FormatMoneyOptions } from "@kenstack/lib/money";

type MoneyProps = Omit<React.ComponentProps<"span">, "children"> &
  FormatMoneyOptions & {
    cents: number | null | undefined;
    fallback?: React.ReactNode;
  };

// Renders integer cents with the shared currency formatter and an explicit empty fallback.
export default function Money({
  cents,
  currency,
  fallback = null,
  locale,
  ...props
}: MoneyProps) {
  if (cents === null || cents === undefined) {
    return fallback;
  }

  return <span {...props}>{formatMoney(cents, { currency, locale })}</span>;
}
