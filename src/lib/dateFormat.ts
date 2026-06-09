import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
} from "date-fns";

export const dateFormat = (dateString: string) => {
  return format(new Date(dateString), "MMM d, yyyy, h:mm a");
};

export function relativeDateFormat(
  dateString: string | Date,
  { historicalAfterDays = 30 }: { historicalAfterDays?: number } = {},
) {
  const date = new Date(dateString);
  const daysFromToday = Math.abs(differenceInCalendarDays(date, new Date()));

  if (daysFromToday > historicalAfterDays) {
    return format(date, "MMM d, yyyy, h:mm a");
  }

  return formatDistanceToNow(date, { addSuffix: true });
}
