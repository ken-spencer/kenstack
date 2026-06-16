import { dateFormat } from "@kenstack/lib/dateFormat";

export default function MetaDates({
  createdAt,
  updatedAt,
}: {
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-gray-700 sm:flex-row sm:flex-wrap sm:gap-2">
      <div className="whitespace-nowrap">
        C: <time dateTime={createdAt}>{dateFormat(createdAt)}</time>
      </div>
      <div className="whitespace-nowrap">
        U: <time dateTime={updatedAt}>{dateFormat(updatedAt)}</time>
      </div>
    </div>
  );
}
