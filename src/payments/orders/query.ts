import * as z from "zod";

import type {
  AdminFilterMeta,
  AdminSortMeta,
} from "@kenstack/admin/types/list";
import {
  createDefaultListQueryState,
  createListSearchSchema,
  listQuerySearchParams,
  parseListPage,
  type ListQueryStoreState,
} from "@kenstack/list/querySchema";
import type { orders, transactions } from "../tables";

export const orderStatusLabels = {
  active: "Active",
  canceled: "Cancelled",
} satisfies Record<typeof orders.$inferSelect.status, string>;

export const refundStatusLabels = {
  none: "No refund",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export const channelLabels = {
  website: "Website",
  box_office: "Box office",
  phone: "Phone",
  admin: "Admin",
} satisfies Record<typeof orders.$inferSelect.channel, string>;

export const transactionMethodLabels = {
  credit: "Credit card",
  debit: "Debit card",
  prepaid: "Prepaid card",
  unknown: "Unknown method",
  cash: "Cash",
  cheque: "Cheque",
  points: "Points",
} satisfies Record<
  NonNullable<typeof transactions.$inferSelect.method>,
  string
>;

export const paymentStatusLabels = {
  pending: "Pending",
  processing: "Processing",
  requires_action: "Needs customer action",
  incomplete: "Incomplete",
  succeeded: "Succeeded",
  failed: "Failed",
  canceled: "Cancelled",
  none: "No payment attempt",
} satisfies Record<
  typeof transactions.$inferSelect.status | "none" | "incomplete",
  string
>;

export const orderSort: AdminSortMeta[] = [
  { name: "createdAt", label: "Created", defaultDirection: "desc" },
  { name: "customer", label: "Customer", defaultDirection: "asc" },
  { name: "id", label: "Order number", defaultDirection: "desc" },
];

export const orderFilters: AdminFilterMeta[] = [
  ...[
    { name: "status", label: "Order status", labels: orderStatusLabels },
    { name: "channel", label: "Channel", labels: channelLabels },
    { name: "refundStatus", label: "Refund", labels: refundStatusLabels },
    {
      name: "paymentStatus",
      label: "Latest payment",
      labels: paymentStatusLabels,
    },
  ].map(({ name, label, labels }) => ({
    name,
    label,
    kind: "enum" as const,
    options: Object.entries(labels).map(([value, label]) => ({ value, label })),
  })),
  {
    name: "createdAt",
    label: "Created (UTC)",
    kind: "date-range",
  },
  {
    name: "showCancelledUnpaid",
    label: "Cancelled, unpaid",
    kind: "boolean",
  },
];

export const orderQueryDefaults = createDefaultListQueryState(orderSort);

export const orderSearchSchema = createListSearchSchema({
  defaults: orderQueryDefaults,
  filters: [
    ...orderFilters,
    { name: "userId", label: "Customer", kind: "text" },
  ],
  sort: orderSort,
});

export const orderListSchema = z
  .object({
    search: z.record(
      z.string(),
      z.union([z.string(), z.array(z.string()), z.undefined()]),
    ),
  })
  .transform(({ search }) => ({
    ...orderSearchSchema.parse(search),
    page: parseListPage(search.page),
  }));

export function orderSearchParams(
  query: ListQueryStoreState & { page?: number },
) {
  return listQuerySearchParams(query, {
    defaults: orderQueryDefaults,
    sort: orderSort,
  });
}
