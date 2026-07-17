import {
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from "date-fns";

const zonedFormatters = new Map<string, Intl.DateTimeFormat>();

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function getZonedFormatter(
  name: string,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
) {
  const key = `${name}:${timeZone}`;
  const existing = zonedFormatters.get(key);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
  zonedFormatters.set(key, formatter);
  return formatter;
}

export function dateFormat(
  value: string | Date,
  { timeZone }: { timeZone?: string } = {},
) {
  const date = toDate(value);

  if (!timeZone) {
    return format(date, "MMM d, yyyy, h:mm a");
  }

  return getZonedFormatter("date-time", "en-US", timeZone, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateKey(value: string | Date, timeZone: string) {
  const parts = Object.fromEntries(
    getZonedFormatter("date-key", "en-CA", timeZone, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
      .formatToParts(toDate(value))
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: part }) => [type, part]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatLongDate(
  value: string | Date,
  { timeZone }: { timeZone?: string } = {},
) {
  const date = toDate(value);

  if (!timeZone) {
    return format(date, "MMMM d, yyyy");
  }

  return getZonedFormatter("long-date", "en-US", timeZone, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateOnly(value: string | null | undefined) {
  const date = parseDateOnly(value);
  return date ? format(date, "MMM d, yyyy") : null;
}

export function formatShortDateOnly(value: string | null | undefined) {
  const date = parseDateOnly(value);
  return date ? format(date, "MMM d") : null;
}

function parseDateOnly(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function formatTime(value: string | Date, timeZone: string) {
  return getZonedFormatter("time", "en-US", timeZone, {
    hour: "numeric",
    minute: "2-digit",
  }).format(toDate(value));
}

export function relativeDateFormat(
  dateString: string | Date,
  {
    historicalAfterDays = 30,
    timeZone,
  }: { historicalAfterDays?: number; timeZone?: string } = {},
) {
  const date = toDate(dateString);
  const now = new Date();
  const daysFromToday = Math.abs(
    timeZone
      ? differenceInCalendarDays(
          parseISO(formatDateKey(date, timeZone)),
          parseISO(formatDateKey(now, timeZone)),
        )
      : differenceInCalendarDays(date, now),
  );

  if (daysFromToday > historicalAfterDays) {
    return dateFormat(date, { timeZone });
  }

  return formatDistanceToNow(date, { addSuffix: true });
}
