import "server-only";

import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import type { DbTransaction } from "@kenstack/db/types";
import type { createPayments } from "./reconcile";

// Called under the user's row lock by checkout and account card management.
export async function loadCustomer(
  tx: DbTransaction,
  stripe: Stripe,
  config: Pick<Parameters<typeof createPayments>[0], "users" | "customer">,
  user: { id: number; email: string; givenName: string; familyName: string },
  requestId: string,
  customerId: string | null,
) {
  if (customerId) return customerId;
  // Recover a customer whose create response was lost before its local link committed.
  for await (const customer of stripe.customers.list({
    email: user.email,
    limit: 100,
  })) {
    if (customer.metadata[config.customer.metadataKey] === String(user.id)) {
      customerId = customer.id;
      break;
    }
  }
  customerId ??= (
    await stripe.customers.create(
      {
        email: user.email,
        name: `${user.givenName} ${user.familyName}`,
        metadata: { [config.customer.metadataKey]: String(user.id) },
      },
      {
        idempotencyKey: `${config.customer.idempotencyPrefix}:${user.id}:${requestId}`,
      },
    )
  ).id;
  await tx
    .update(config.users)
    .set({ stripeCustomerId: customerId })
    .where(eq(config.users.id, user.id));
  return customerId;
}
