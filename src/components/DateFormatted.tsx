import deps from "@app/deps";
import { formatDateKey, formatTime } from "@kenstack/lib/dateFormat";

export default function DateFormatted({
  date,
  ...props
}: React.ComponentProps<"time"> & { date: string }) {
  return (
    <time {...props} dateTime={date}>
      {new Intl.DateTimeFormat("en-US", {
        timeZone: deps.defaultTimeZone,
        month: "short",
        day: "numeric",
        year:
          formatDateKey(date, deps.defaultTimeZone).slice(0, 4) ===
          formatDateKey(new Date(), deps.defaultTimeZone).slice(0, 4)
            ? undefined
            : "numeric",
      }).format(new Date(date))}
      {" @ "}
      {formatTime(date, deps.defaultTimeZone).toLowerCase()}
    </time>
  );
}
