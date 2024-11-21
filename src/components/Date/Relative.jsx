import { DateTime } from "luxon";

export default function RelativeDate(props) {
  if (!props.value) {
    return;
  }

  const date = DateTime.fromISO(props.value);
  const format = date.toFormat("MMMM dd, yyyy, h:mm a");

  return (
    <span title={format} suppressHydrationWarning>
      {date.toRelative()}
    </span>
  );
}
