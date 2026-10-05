import {
  Ban,
  CircleAlert,
  CircleCheck,
  CircleQuestionMark,
  CircleX,
  Clock,
  ClockAlert,
  Flag,
  LoaderCircle,
  Send,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import type { emailMessages } from "@kenstack/db/tables/emailMessages";

type EmailStatus = typeof emailMessages.$inferSelect.status;

export const emailStatusLabels = {
  pending: "Queued",
  sending: "Sending",
  sent: "Sent",
  delayed: "Delayed",
  delivered: "Delivered",
  "soft-bounced": "Soft bounce",
  bounced: "Bounced",
  complained: "Marked as spam",
  failed: "Failed",
  skipped: "Skipped",
} satisfies Record<EmailStatus, string>;

const statusIcons: Record<EmailStatus, { Icon: LucideIcon; color: string }> = {
  pending: { Icon: Clock, color: "text-muted-foreground" },
  sending: { Icon: LoaderCircle, color: "text-sky-600 dark:text-sky-400" },
  sent: { Icon: Send, color: "text-sky-600 dark:text-sky-400" },
  delayed: { Icon: ClockAlert, color: "text-amber-600 dark:text-amber-400" },
  delivered: {
    Icon: CircleCheck,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  "soft-bounced": {
    Icon: CircleAlert,
    color: "text-amber-600 dark:text-amber-400",
  },
  bounced: { Icon: CircleX, color: "text-destructive" },
  complained: { Icon: Flag, color: "text-destructive" },
  failed: { Icon: TriangleAlert, color: "text-destructive" },
  skipped: { Icon: Ban, color: "text-muted-foreground" },
};

// A send still `sending` after a few minutes never reported its outcome; it is never resent
// automatically, so staff see it flagged. The label is the hover title, with the failure reason when
// one is given, and stays readable to screen readers when only the icon shows.
export default function StatusBadge({
  iconOnly = false,
  isUnconfirmed,
  reason,
  status,
}: {
  iconOnly?: boolean;
  isUnconfirmed: boolean;
  reason?: string | null;
  status: EmailStatus;
}) {
  const { Icon, color } = isUnconfirmed
    ? {
        Icon: CircleQuestionMark,
        color: "text-amber-600 dark:text-amber-400",
      }
    : statusIcons[status];
  const label = isUnconfirmed ? "Not confirmed" : emailStatusLabels[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      title={reason ? `${label}: ${reason}` : label}
    >
      <Icon className={`size-5 shrink-0 ${color}`} aria-hidden="true" />
      <span className={iconOnly ? "sr-only" : undefined}>{label}</span>
    </span>
  );
}
