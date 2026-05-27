import { useMemo } from "react";
import { format, isSameYear, parseISO } from "date-fns";

export default function DateFormatted({
  date,
  ...props
}: React.ComponentProps<"time"> & { date: string }) {
  const formatted = useMemo(() => {
    const dt = parseISO(date);

    const dateStr = isSameYear(dt, new Date())
      ? format(dt, "MMM d")
      : format(dt, "MMM d, yyyy");

    const timeStr = format(dt, "h:mm a").toLowerCase();

    return dateStr + " @ " + timeStr;
  }, [date]);

  return (
    // `dateTime` stays stable for SEO/semantics
    <time {...props} dateTime={String(date)} suppressHydrationWarning={true}>
      {formatted}
    </time>
  );
}
