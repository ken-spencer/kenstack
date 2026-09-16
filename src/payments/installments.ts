// Hosts use this split for quotes; Stripe reconciliation uses the same first-payment rounding.
export function calculateInstallments(
  totalCents: number,
  paymentCount: number,
) {
  const monthlyPaymentCents = Math.floor(totalCents / paymentCount);

  return {
    firstPaymentCents: totalCents - monthlyPaymentCents * (paymentCount - 1),
    finalPaymentCents: monthlyPaymentCents,
    monthlyPaymentCents,
  };
}
