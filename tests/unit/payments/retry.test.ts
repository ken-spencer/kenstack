import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@kenstack/logger", () => ({ audit: vi.fn() }));
import { retryPayment } from "@kenstack/payments/server";
import { audit } from "@kenstack/logger";

const insert = vi.fn();
const beforeRetry = vi.fn();
let latest: {
  id: number;
  status: string;
  instalment: number | null;
  totalCents: number;
  stripeInvoiceId: string | null;
  stripePaymentIntentId: string | null;
};
// The mock supplies the Drizzle operations used by this boundary without a PostgreSQL connection.
const tx = {
  select: () => ({
    from: () => ({
      where: () => ({ orderBy: () => ({ limit: async () => [latest] }) }),
    }),
  }),
  insert: () => ({ values: insert }),
} as unknown as Parameters<typeof retryPayment>[0];
const order = {
  id: 10001,
  userId: 7,
  stripeSubscriptionId: null,
} as Parameters<typeof retryPayment>[1];

beforeEach(() => {
  vi.clearAllMocks();
  latest = {
    id: 3,
    status: "failed",
    instalment: 1,
    totalCents: 2500,
    stripeInvoiceId: "in_original",
    stripePaymentIntentId: "pi_original",
  };
  insert.mockReturnValue({ returning: async () => [{ id: 4 }] });
});

it.each([
  ["succeeded", 1, 3],
  ["processing", 1, 3],
  ["failed", 2, 3],
  ["failed", 1, 2],
])(
  "does not retry %s instalment %s with previous collection %s",
  async (status, instalment, previousTransactionId) => {
    latest.status = status;
    latest.instalment = instalment;
    await retryPayment(tx, order, previousTransactionId, beforeRetry);
    expect(beforeRetry).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  },
);

it.each([null, "sub_original"])(
  "keeps accepted amounts and reuses an invoice-owned intent only for subscription %s",
  async (stripeSubscriptionId) => {
    beforeRetry.mockImplementationOnce(async () =>
      expect(insert).not.toHaveBeenCalled(),
    );
    await retryPayment(tx, { ...order, stripeSubscriptionId }, 3, beforeRetry);
    expect(beforeRetry).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith({
      orderId: 10001,
      kind: "payment",
      instalment: 1,
      totalCents: 2500,
      stripeInvoiceId: "in_original",
      stripePaymentIntentId: stripeSubscriptionId ? "pi_original" : null,
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payment.retry",
        rowId: 4,
        data: { previousTransactionId: 3, orderId: 10001 },
      }),
    );
  },
);

it("does not insert a retry when the domain reservation cannot be renewed", async () => {
  beforeRetry.mockRejectedValueOnce(new Error("Reservation ended"));
  await expect(retryPayment(tx, order, 3, beforeRetry)).rejects.toThrow(
    "Reservation ended",
  );
  expect(insert).not.toHaveBeenCalled();
});
