import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import * as z from "zod";

import { db } from "@app/db";
import { ReturnedError } from "@kenstack/api/errors";
import { getFreshCurrentUser } from "@kenstack/auth/server/user";
import { users } from "@kenstack/modules/users/tables";
import { orders, orderItems, transactions } from "../tables";
import { orderListSchema, type refundStatusLabels } from "./query";

async function requireOrdersAdmin() {
  const user = await getFreshCurrentUser();
  if (!user)
    throw new ReturnedError("Sign in to view orders.", { status: 401 });
  if (!user.roles.includes("admin")) {
    throw new ReturnedError("You do not have permission to view orders.", {
      status: 403,
    });
  }
}

const customerSelection = {
  id: users.id,
  givenName: users.givenName,
  familyName: users.familyName,
  email: users.email,
};

export async function searchOrderCustomers(term: string) {
  await requireOrdersAdmin();
  const search = term.trim();
  if (search.length < 2) return { customers: [] };
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  return {
    customers: await db
      .select(customerSelection)
      .from(users)
      .where(
        and(
          isNull(users.deletedAt),
          or(
            ilike(
              sql`concat_ws(' ', ${users.givenName}, ${users.familyName})`,
              pattern,
            ),
            ilike(users.email, pattern),
          ),
        ),
      )
      .orderBy(asc(users.familyName), asc(users.givenName), asc(users.id))
      .limit(20),
  };
}

function selectOrderStatus() {
  return {
    latestPaymentStatus: sql<
      typeof transactions.$inferSelect.status | "none" | "incomplete"
    >`coalesce((${db
      .select({
        status: sql`case
        when ${transactions.status} = 'requires_action'
          and ${transactions.createdAt} <= now() - interval '24 hours'
        then 'incomplete'
        else ${transactions.status}::text
      end`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.orderId, orders.id),
          eq(transactions.kind, "payment"),
        ),
      )
      .orderBy(desc(transactions.id))
      .limit(1)}), 'none')`,
    refundStatus: sql<keyof typeof refundStatusLabels>`(${db
      .select({
        status: sql`case
        when coalesce(sum(${transactions.totalCents}) filter (where ${transactions.kind} = 'refund'), 0) < 0
        then case
          when sum(${transactions.totalCents}) filter (where ${transactions.kind} in ('payment', 'refund')) <= 0
          then 'refunded'
          else 'partially_refunded'
        end
        else 'none'
      end`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.orderId, orders.id),
          eq(transactions.status, "succeeded"),
        ),
      )})`,
  };
}

export async function listOrders(query: z.output<typeof orderListSchema>) {
  await requireOrdersAdmin();
  const filters = z
    .object({
      userId: z.coerce
        .number()
        .int()
        .positive()
        .max(2147483647)
        .optional()
        .catch(undefined),
      status: z.record(z.string(), z.enum(["+", "-"])).optional(),
      channel: z.record(z.string(), z.enum(["+", "-"])).optional(),
      paymentStatus: z.record(z.string(), z.enum(["+", "-"])).optional(),
      refundStatus: z.record(z.string(), z.enum(["+", "-"])).optional(),
      showCancelledUnpaid: z.boolean().optional().catch(undefined),
      createdAt: z
        .object({
          from: z.iso.date().optional().catch(undefined),
          to: z.iso.date().optional().catch(undefined),
        })
        .optional(),
    })
    .parse(query.filters);
  const { latestPaymentStatus, refundStatus } = selectOrderStatus();
  const paidCents = sql<number>`(${db
    .select({ total: sql`coalesce(sum(${transactions.totalCents}), 0)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.orderId, orders.id),
        eq(transactions.kind, "payment"),
        eq(transactions.status, "succeeded"),
      ),
    )})`.mapWith(Number);
  const conditions: (SQL | undefined)[] = [
    filters.userId ? eq(orders.userId, filters.userId) : undefined,
    // Changing a selection after a declined card cancels that order and starts
    // another, so a cancelled order that never collected money is hidden until
    // staff ask to see it.
    filters.showCancelledUnpaid
      ? undefined
      : sql`not (${eq(orders.status, "canceled")} and ${paidCents} = 0)`,
    filters.createdAt?.from
      ? sql`${orders.createdAt} >= ${filters.createdAt.from}::date at time zone 'UTC'`
      : undefined,
    filters.createdAt?.to
      ? sql`${orders.createdAt} < (${filters.createdAt.to}::date + interval '1 day') at time zone 'UTC'`
      : undefined,
  ];
  for (const [field, values] of [
    [orders.status, filters.status],
    [orders.channel, filters.channel],
    [latestPaymentStatus, filters.paymentStatus],
    [refundStatus, filters.refundStatus],
  ] as const) {
    const included = Object.entries(values ?? {})
      .filter(([, state]) => state === "+")
      .map(([value]) => value);
    const excluded = Object.entries(values ?? {})
      .filter(([, state]) => state === "-")
      .map(([value]) => value);
    if (included.length)
      conditions.push(
        sql`${field} in (${sql.join(
          included.map((value) => sql`${value}`),
          sql`, `,
        )})`,
      );
    if (excluded.length)
      conditions.push(
        sql`${field} not in (${sql.join(
          excluded.map((value) => sql`${value}`),
          sql`, `,
        )})`,
      );
  }
  if (query.keywords) {
    const pattern = `%${query.keywords.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(sql`${orders.id}::text`, pattern),
        ilike(
          sql`concat_ws(' ', ${orders.customerSnapshot}->>'givenName', ${orders.customerSnapshot}->>'familyName', ${orders.customerSnapshot}->>'email')`,
          pattern,
        ),
        sql`exists (select 1 from ${orderItems} where ${orderItems.orderId} = ${orders.id} and ${orderItems.description} ilike ${pattern})`,
        sql`exists (select 1 from ${transactions} where ${transactions.orderId} = ${orders.id} and concat_ws(' ', ${transactions.id}::text, ${transactions.stripePaymentIntentId}, ${transactions.stripeChargeId}, ${transactions.stripeInvoiceId}, ${transactions.stripeRefundId}, ${transactions.stripeDisputeId}, ${transactions.stripeBalanceTransactionId}) ilike ${pattern})`,
      ),
    );
  }
  const where = and(...conditions);
  const direction = query.direction === "asc" ? asc : desc;
  const [rows, [total], [customer]] = await Promise.all([
    db
      .select({
        id: orders.id,
        userId: orders.userId,
        customerSnapshot: orders.customerSnapshot,
        channel: orders.channel,
        status: orders.status,
        currency: orders.currency,
        createdAt: orders.createdAt,
        paymentCount: orders.paymentCount,
        monthlyCents: orders.monthlyCents,
        latestPaymentStatus,
        refundStatus,
        committedCents: sql<number | null>`(${db
          .select({
            total: sql`case when count(*) = count(${orderItems.totalCents}) then coalesce(sum(${orderItems.totalCents}), 0) end`,
          })
          .from(orderItems)
          .where(eq(orderItems.orderId, orders.id))})`.mapWith((value) =>
          value === null ? null : Number(value),
        ),
        paidCents,
        collectedCents: sql<number>`(${db
          .select({ total: sql`coalesce(sum(${transactions.totalCents}), 0)` })
          .from(transactions)
          .where(
            and(
              eq(transactions.orderId, orders.id),
              eq(transactions.status, "succeeded"),
            ),
          )})`.mapWith(Number),
      })
      .from(orders)
      .where(where)
      .orderBy(
        direction(
          query.sort === "id"
            ? orders.id
            : query.sort === "customer"
              ? sql`lower(concat_ws(' ', ${orders.customerSnapshot}->>'familyName', ${orders.customerSnapshot}->>'givenName', ${orders.customerSnapshot}->>'email'))`
              : orders.createdAt,
        ),
        direction(orders.id),
      )
      .limit(25)
      .offset((query.page - 1) * 25),
    db.select({ count: count() }).from(orders).where(where),
    filters.userId
      ? db
          .select(customerSelection)
          .from(users)
          .where(eq(users.id, filters.userId))
          .limit(1)
      : [],
  ]);
  return {
    orders: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    total: total?.count ?? 0,
    page: query.page,
    pageSize: 25,
    customer: customer ?? null,
  };
}

export async function loadOrder(id: number) {
  await requireOrdersAdmin();
  const [order] = await db
    .select({ ...getTableColumns(orders), ...selectOrderStatus() })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!order) return null;
  const [items, payments] = await Promise.all([
    db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(orderItems.id)),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.orderId, id))
      .orderBy(desc(transactions.id)),
  ]);
  return { order, items, transactions: payments };
}
