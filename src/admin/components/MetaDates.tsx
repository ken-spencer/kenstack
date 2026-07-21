import { dateFormat } from "@kenstack/lib/dateFormat";

export default function MetaDates({
  record,
}: {
  record: { createdAt: string; updatedAt: string };
}) {
  return (
    <div className="text-muted-foreground flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:gap-2">
      <div className="whitespace-nowrap">
        C:{" "}
        <time dateTime={record.createdAt} suppressHydrationWarning>
          {dateFormat(record.createdAt)}
        </time>
      </div>
      <div className="whitespace-nowrap">
        U:{" "}
        <time dateTime={record.updatedAt} suppressHydrationWarning>
          {dateFormat(record.updatedAt)}
        </time>
      </div>
    </div>
  );
}
