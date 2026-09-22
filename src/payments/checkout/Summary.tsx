import type { ReactNode } from "react";

import { formatMoney } from "@kenstack/lib/money";

import type { CheckoutSessionResult } from "./server";

export default function Summary({
  currency,
  quote,
  dueNowLabel = "Due today",
  isRefreshing,
  children,
}: {
  currency: string;
  quote: CheckoutSessionResult["quote"];
  // The completion page of a paid order names the same amount as paid.
  dueNowLabel?: string;
  isRefreshing?: boolean;
  children?: ReactNode;
}) {
  const taxes = new Map<
    string,
    (typeof quote.lines)[number]["taxes"][number]
  >();
  for (const tax of quote.lines.flatMap((line) => line.taxes)) {
    const label = tax.code ?? tax.name;
    taxes.set(label, {
      ...tax,
      amountCents: (taxes.get(label)?.amountCents ?? 0) + tax.amountCents,
    });
  }
  return (
    <div aria-busy={isRefreshing} className="summary">
      <h3>Order summary</h3>
      <ul className="lines">
        {quote.lines.map((line, index) => (
          <li key={index}>
            <span className="description">{line.description}</span>
            {line.quantity > 1 ? (
              <span className="quantity">× {line.quantity}</span>
            ) : null}
            <span className="amount">
              {formatMoney(line.quantity * line.unitCents, { currency })}
            </span>
          </li>
        ))}
      </ul>
      {taxes.size ? (
        <ul className="taxes">
          {[...taxes].map(([label, tax]) => (
            <li className={tax.isIncluded ? "included" : undefined} key={label}>
              <span className="label">
                {tax.isIncluded
                  ? `Includes ${label}`
                  : `${label} (${tax.rate}%)`}
              </span>
              <span className="amount">
                {formatMoney(tax.amountCents, { currency })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {children ? <div className="details">{children}</div> : null}
      <p className="total">
        <span className="label">{dueNowLabel}</span>
        <span className="amount">
          {formatMoney(quote.dueNowCents, { currency })}
        </span>
      </p>
      {quote.schedule.type === "monthly" ? (
        <p className="schedule">then monthly until you cancel</p>
      ) : quote.schedule.type === "instalments" &&
        quote.recurringCents !== null ? (
        <p className="schedule">
          then {quote.schedule.count - 1} monthly{" "}
          {quote.schedule.count === 2 ? "payment" : "payments"} of{" "}
          {formatMoney(quote.recurringCents, { currency })} (
          {formatMoney(quote.totalCents, { currency })} in total)
        </p>
      ) : null}
    </div>
  );
}
