import { Badge } from "@kenstack/components/Badge";
import type { listOrders } from "./queries";
import {
  orderStatusLabels,
  paymentStatusLabels,
  refundStatusLabels,
} from "./query";

export default function StatusBadge({
  order,
}: {
  order: Pick<
    Awaited<ReturnType<typeof listOrders>>["orders"][number],
    "status" | "latestPaymentStatus" | "refundStatus"
  >;
}) {
  return (
    <Badge
      variant={
        order.refundStatus === "none" &&
        order.status !== "canceled" &&
        (order.latestPaymentStatus === "failed" ||
          order.latestPaymentStatus === "incomplete" ||
          order.latestPaymentStatus === "requires_action")
          ? "destructive"
          : "secondary"
      }
    >
      {order.refundStatus !== "none"
        ? refundStatusLabels[order.refundStatus]
        : order.status === "canceled"
          ? orderStatusLabels[order.status]
          : paymentStatusLabels[order.latestPaymentStatus]}
    </Badge>
  );
}
