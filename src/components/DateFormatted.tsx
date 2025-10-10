import { useMemo } from "react";

import { DateTime } from "luxon";
export default function DateFormatted({ date, ...props }) {
  // const [formatted, setFormatted] = useState('');

  const formatted = useMemo(() => {
    const dt = DateTime.fromISO(date);
    const now = DateTime.local();

    const dateStr = dt.hasSame(now, "year")
      ? dt.toFormat("MMM d")
      : dt.toFormat("MMM d, yyyy");

    const timeStr = dt.toFormat("h:mm a").toLowerCase();

    // const dt = new Date(date);
    // const dateStr = new Intl.DateTimeFormat(undefined, {
    //   year: 'numeric',
    //   month: 'short',
    //   day: '2-digit',
    //   // hour: '2-digit',
    //   // minute: '2-digit',
    // }).format(dt)

    // const timeStr = new Intl.DateTimeFormat(undefined, {
    //   hour: '2-digit',
    //   minute: '2-digit',
    // }).format(dt)

    return dateStr + " @ " + timeStr;
  }, [date]);

  return (
    // `dateTime` stays stable for SEO/semantics
    <time {...props} dateTime={String(date)} suppressHydrationWarning={true}>
      {formatted}
    </time>
  );
}
