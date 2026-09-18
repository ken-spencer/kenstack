import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@app/db";
import { ReturnedError } from "@kenstack/api/errors";
import { audit } from "@kenstack/logger";
import { loadStripeConfig } from "./server";
import { loadCustomer } from "./customer";
import { orders, orderItems } from "./tables";
import type { createPayments } from "./reconcile";

// createPayments supplies the host's account linkage; callers supply a freshly authenticated user.
export function createPaymentMethods(
  config: Pick<Parameters<typeof createPayments>[0], "users" | "customer">,
) {
  async function loadPaymentCustomer(user: Parameters<typeof loadCustomer>[3]) {
    const { stripe, livemode, publishableKey } = loadStripeConfig();
    const [account] = await db
      .select({ stripeCustomerId: config.users.stripeCustomerId })
      .from(config.users)
      .where(eq(config.users.id, user.id));
    if (!account)
      throw new ReturnedError("Account not found.", { status: 404 });
    const customerId =
      account.stripeCustomerId ??
      (await db.transaction(async (tx) => {
        const [locked] = await tx
          .select({ stripeCustomerId: config.users.stripeCustomerId })
          .from(config.users)
          .where(eq(config.users.id, user.id))
          .for("update");
        if (!locked)
          throw new ReturnedError("Account not found.", { status: 404 });
        return loadCustomer(
          tx,
          stripe,
          config,
          user,
          randomUUID(),
          locked.stripeCustomerId,
        );
      }));
    const customer = await stripe.customers.retrieve(customerId);
    if (
      customer.deleted ||
      customer.livemode !== livemode ||
      customer.metadata[config.customer.metadataKey] !== String(user.id)
    )
      throw new Error("Stripe customer does not match the account.");
    return { stripe, livemode, publishableKey, customer };
  }

  async function loadPaymentMethods(
    user: Parameters<typeof loadPaymentCustomer>[0],
  ) {
    const { stripe, publishableKey, customer, livemode } =
      await loadPaymentCustomer(user);
    const [methods, subscriptions, purchases] = await Promise.all([
      stripe.paymentMethods
        .list({ customer: customer.id, type: "card", limit: 100 })
        .autoPagingToArray({ limit: 10000 }),
      stripe.subscriptions
        .list({ customer: customer.id, status: "all", limit: 100 })
        .autoPagingToArray({ limit: 10000 }),
      db
        .select({
          id: orders.id,
          requestId: orders.requestId,
          stripeSubscriptionId: orders.stripeSubscriptionId,
          description: orderItems.description,
        })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(and(eq(orders.userId, user.id), eq(orders.status, "active"))),
    ]);
    const defaultPaymentMethodId =
      typeof customer.invoice_settings.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings.default_payment_method?.id ?? null);
    const active = subscriptions.filter(
      (subscription) =>
        !["canceled", "incomplete_expired"].includes(subscription.status),
    );
    return {
      publishableKey,
      cards: methods.flatMap((method) =>
        method.card
          ? [
              {
                id: method.id,
                brand: method.card.brand,
                last4: method.card.last4,
                expiryMonth: method.card.exp_month,
                expiryYear: method.card.exp_year,
                isDefault: method.id === defaultPaymentMethodId,
              },
            ]
          : [],
      ),
      plans: active.flatMap((subscription) => {
        const lines = purchases.filter(
          (purchase) => purchase.stripeSubscriptionId === subscription.id,
        );
        if (!lines.length) return [];
        if (
          subscription.livemode !== livemode ||
          subscription.metadata.orderId !== String(lines[0].id) ||
          subscription.metadata.requestId !== lines[0].requestId
        )
          throw new Error("Subscription does not match the account purchase.");
        return [
          {
            id: lines[0].id,
            description: lines.map((line) => line.description).join(", "),
            paymentMethodId:
              typeof subscription.default_payment_method === "string"
                ? subscription.default_payment_method
                : (subscription.default_payment_method?.id ??
                  defaultPaymentMethodId),
          },
        ];
      }),
    };
  }

  async function createCardSetup(
    user: Parameters<typeof loadPaymentCustomer>[0],
  ) {
    const { stripe, customer } = await loadPaymentCustomer(user);
    return {
      clientSecret: (
        await stripe.setupIntents.create({
          customer: customer.id,
          payment_method_types: ["card"],
          usage: "off_session",
          metadata: { userId: String(user.id) },
        })
      ).client_secret,
    };
  }

  async function createCheckoutCustomerSession(
    user: Parameters<typeof loadPaymentCustomer>[0],
  ) {
    const { stripe, customer } = await loadPaymentCustomer(user);
    return (
      await stripe.customerSessions.create({
        customer: customer.id,
        components: {
          payment_element: {
            enabled: true,
            features: {
              payment_method_redisplay: "enabled",
              payment_method_remove: "disabled",
              payment_method_save: "disabled",
            },
          },
        },
      })
    ).client_secret;
  }

  async function changePaymentMethod(
    user: Parameters<typeof loadPaymentCustomer>[0],
    input: {
      paymentMethodId: string;
      operation: "default" | "remove" | "subscription";
      orderId?: number;
    },
  ) {
    const { stripe, customer, livemode } = await loadPaymentCustomer(user);
    // Serialize card removal and plan reassignment with checkout's customer link lock.
    await db.transaction(async (tx) => {
      await tx
        .select({ id: config.users.id })
        .from(config.users)
        .where(eq(config.users.id, user.id))
        .for("update");
      const method = await stripe.paymentMethods.retrieve(
        input.paymentMethodId,
      );
      if (
        method.customer !== customer.id ||
        method.livemode !== livemode ||
        method.type !== "card"
      )
        throw new ReturnedError("Card not found.", { status: 404 });
      if (input.operation === "subscription") {
        const [order] = await tx
          .select({
            id: orders.id,
            requestId: orders.requestId,
            status: orders.status,
            stripeSubscriptionId: orders.stripeSubscriptionId,
          })
          .from(orders)
          .where(
            and(eq(orders.id, input.orderId ?? 0), eq(orders.userId, user.id)),
          );
        if (!order?.stripeSubscriptionId || order.status !== "active")
          throw new ReturnedError("Recurring purchase not found.", {
            status: 404,
          });
        const subscription = await stripe.subscriptions.retrieve(
          order.stripeSubscriptionId,
        );
        if (
          subscription.customer !== customer.id ||
          subscription.livemode !== livemode ||
          subscription.metadata.orderId !== String(order.id) ||
          subscription.metadata.requestId !== order.requestId
        )
          throw new Error("Subscription does not match the account purchase.");
        if (["canceled", "incomplete_expired"].includes(subscription.status))
          throw new ReturnedError("This recurring purchase has ended.", {
            status: 409,
          });
        await stripe.subscriptions.update(subscription.id, {
          default_payment_method: method.id,
        });
      } else if (input.operation === "default") {
        await stripe.paymentMethods.update(method.id, {
          allow_redisplay: "always",
        });
        await stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: method.id },
        });
      } else {
        const current = await stripe.customers.retrieve(customer.id);
        if (current.deleted)
          throw new ReturnedError("Account not found.", { status: 404 });
        const defaultId =
          typeof current.invoice_settings.default_payment_method === "string"
            ? current.invoice_settings.default_payment_method
            : current.invoice_settings.default_payment_method?.id;
        for await (const subscription of stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 100,
        })) {
          if (["canceled", "incomplete_expired"].includes(subscription.status))
            continue;
          const methodId =
            typeof subscription.default_payment_method === "string"
              ? subscription.default_payment_method
              : (subscription.default_payment_method?.id ?? defaultId);
          if (methodId === method.id)
            throw new ReturnedError(
              "Choose another card for your recurring payments before removing this card.",
              { status: 409 },
            );
        }
        await stripe.paymentMethods.detach(method.id);
      }
      await audit({
        db: tx,
        userId: user.id,
        action: `payment.card_${input.operation}`,
        table: "users",
        rowId: user.id,
        data: { paymentMethodId: method.id, orderId: input.orderId },
      });
    });
  }
  return {
    loadPaymentMethods,
    createCardSetup,
    createCheckoutCustomerSession,
    changePaymentMethod,
  };
}
