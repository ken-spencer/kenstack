import { dateFormat } from "@kenstack/lib/dateFormat";

export default function Updated({ value }: { value: string }) {
  return (
    <time
      className="text-muted-foreground text-xs whitespace-nowrap"
      dateTime={value}
      suppressHydrationWarning
    >
      {dateFormat(value)}
    </time>
  );
}
