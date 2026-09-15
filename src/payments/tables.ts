// Hosts register these shared payment tables and enums in their Drizzle schema.
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import type Stripe from "stripe";

import { users } from "@kenstack/modules/users/tables";

// Hosts opt into Stripe customer identity alongside their commerce tables.
export const paymentUserColumns = {
  stripeCustomerId: text("stripe_customer_id").unique(),
};

export const orderChannel = pgEnum("order_channel", [
  "website",
  "box_office",
  "phone",
  "admin",
]);
export const orderStatus = pgEnum("order_status", ["active", "canceled"]);
export const transactionKind = pgEnum("transaction_kind", [
  "payment",
  "refund",
  "dispute",
  "dispute_reversal",
]);
export const transactionMethod = pgEnum("transaction_method", [
  "credit",
  "debit",
  "prepaid",
  "unknown",
  "cash",
  "cheque",
  "points",
]);
export const transactionStatus = pgEnum("transaction_status", [
  "pending",
  "processing",
  "requires_action",
  "succeeded",
  "failed",
  "canceled",
]);

export const orders = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 10001 }),
    requestId: varchar("request_id", { length: 15 }).notNull().unique(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    channel: orderChannel().notNull(),
    currency: varchar({ length: 3 }).notNull(),
    customerSnapshot: jsonb("customer_snapshot")
      .$type<{
        givenName: string;
        familyName: string;
        email: string;
        addressLine1: string;
        addressLine2: string;
        locality: string;
        regionCode: string;
        postalCode: string;
        countryCode: string;
      }>()
      .notNull(),
    status: orderStatus().notNull().default("active"),
    paymentCount: integer("payment_count"),
    monthlyCents: integer("monthly_cents"),
    coverFees: boolean("cover_fees").notNull().default(false),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripeScheduleId: text("stripe_schedule_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("orders_user_id_idx").on(t.userId),
    check("orders_currency_check", sql`${t.currency} ~ '^[a-z]{3}$'`),
    check(
      "orders_payment_count_check",
      sql`${t.paymentCount} IS NULL OR ${t.paymentCount} > 0`,
    ),
    check(
      "orders_monthly_cents_check",
      sql`(${t.paymentCount} IS NULL AND ${t.monthlyCents} IS NOT NULL AND ${t.monthlyCents} > 0)
        OR (${t.paymentCount} IS NOT NULL AND ${t.monthlyCents} IS NULL)`,
    ),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    kind: text().notNull(),
    description: text().notNull(),
    quantity: integer().notNull(),
    unitCents: integer("unit_cents").notNull(),
    totalCents: integer("total_cents"),
    discounts: jsonb()
      .$type<
        {
          id: string;
          name: string;
          rule: string;
          amountCents: number;
        }[]
      >()
      .notNull()
      .default([]),
    taxes: jsonb()
      .$type<
        {
          id: string;
          name: string;
          rate: number;
          isIncluded: boolean;
          amountCents: number;
        }[]
      >()
      .notNull()
      .default([]),
  },
  (t) => [
    index("order_items_order_id_idx").on(t.orderId),
    check("order_items_quantity_check", sql`${t.quantity} > 0`),
    check("order_items_unit_cents_check", sql`${t.unitCents} >= 0`),
    check("order_items_total_cents_check", sql`${t.totalCents} >= 0`),
    check(
      "order_items_discounts_check",
      sql`jsonb_typeof(${t.discounts}) = 'array'`,
    ),
    check("order_items_taxes_check", sql`jsonb_typeof(${t.taxes}) = 'array'`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    kind: transactionKind().notNull(),
    originalTransactionId: integer("original_transaction_id"),
    instalment: integer(),
    totalCents: integer("total_cents").notNull(),
    // Null means the provider fee has not been reconciled; fee returns may be negative.
    feeCents: integer("fee_cents"),
    // Requested for future POS cash payments; change derives from tender and rounding.
    tenderedCents: integer("tendered_cents"),
    roundingCents: integer("rounding_cents"),
    method: transactionMethod(),
    // Requested for future points redemption, earning and compensating changes.
    points: integer(),
    status: transactionStatus().notNull().default("pending"),
    errorCode: text("error_code"),
    stripeInvoiceId: text("stripe_invoice_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id").unique(),
    stripeRefundId: text("stripe_refund_id").unique(),
    stripeDisputeId: text("stripe_dispute_id"),
    stripeBalanceTransactionId: text("stripe_balance_transaction_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    unique("transactions_id_order_unique").on(t.id, t.orderId),
    foreignKey({
      columns: [t.originalTransactionId, t.orderId],
      foreignColumns: [t.id, t.orderId],
      name: "transactions_original_order_fk",
    }).onDelete("restrict"),
    index("transactions_order_instalment_idx").on(t.orderId, t.instalment),
    index("transactions_original_transaction_idx").on(t.originalTransactionId),
    index("transactions_stripe_invoice_idx").on(t.stripeInvoiceId),
    index("transactions_stripe_payment_intent_idx").on(t.stripePaymentIntentId),
    index("transactions_stripe_dispute_idx").on(t.stripeDisputeId),
    check(
      "transactions_original_check",
      sql`(${t.kind} = 'payment' AND ${t.originalTransactionId} IS NULL)
        OR (${t.kind} <> 'payment' AND ${t.originalTransactionId} IS NOT NULL AND ${t.originalTransactionId} <> ${t.id})`,
    ),
    check(
      "transactions_instalment_check",
      sql`${t.instalment} IS NULL OR (${t.kind} = 'payment' AND ${t.instalment} > 0)`,
    ),
    // Zero-value points postings must not manufacture an additional money payment or refund.
    check(
      "transactions_total_cents_check",
      sql`(${t.kind} IN ('payment', 'dispute_reversal') AND ${t.totalCents} > 0)
        OR (${t.kind} IN ('refund', 'dispute') AND ${t.totalCents} < 0)
        OR (${t.kind} IN ('payment', 'refund') AND ${t.totalCents} = 0
          AND ${t.method} IS NOT NULL AND ${t.method} = 'points'
          AND ${t.points} IS NOT NULL AND ${t.points} <> 0)`,
    ),
    check("transactions_tendered_cents_check", sql`${t.tenderedCents} >= 0`),
    check(
      "transactions_cash_check",
      sql`(${t.method} IS NOT NULL AND ${t.method} = 'cash')
        OR (${t.tenderedCents} IS NULL AND ${t.roundingCents} IS NULL)`,
    ),
    check(
      "transactions_succeeded_method_check",
      sql`${t.status} <> 'succeeded' OR ${t.method} IS NOT NULL`,
    ),
    check(
      "transactions_finished_at_check",
      sql`(${t.status} IN ('succeeded', 'failed', 'canceled')) = (${t.finishedAt} IS NOT NULL)`,
    ),
    check(
      "transactions_refund_check",
      sql`${t.stripeRefundId} IS NULL OR ${t.kind} = 'refund'`,
    ),
    check(
      "transactions_dispute_check",
      sql`${t.stripeDisputeId} IS NULL OR ${t.kind} IN ('dispute', 'dispute_reversal')`,
    ),
    check(
      "transactions_collection_references_check",
      sql`${t.kind} = 'payment' OR (${t.stripeInvoiceId} IS NULL
        AND ${t.stripePaymentIntentId} IS NULL AND ${t.stripeChargeId} IS NULL)`,
    ),
  ],
);

export const paymentEvents = pgTable("payment_events", {
  id: text().primaryKey(),
  type: text().notNull(),
  message: text(),
  payload: jsonb().$type<Stripe.Event>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
