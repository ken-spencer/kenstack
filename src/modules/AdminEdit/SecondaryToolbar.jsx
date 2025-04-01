import { useAdminEdit } from "./context";
import { DateTime } from "luxon";

export default function SecondaryToolbar() {
  const { id, doc } = useAdminEdit();

  if (!id) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-2 admin-border bg-gray-100 dark:bg-gray-900 text-sm">
      <DateFormat date={doc["meta.createdAt"]} title="Created:" />
      <DateFormat date={doc["meta.updatedAt"]} title="Updated:" />
    </div>
  );
}

function DateFormat({ date: dateStr, title }) {
  if (!dateStr) {
    return null;
  }

  const date = DateTime.fromISO(dateStr);
  const format = date.toFormat("MMMM dd, yyyy @ h:mm a");

  return (
    <div className="flex gap-2">
      <strong>{title}</strong>
      <span suppressHydrationWarning>{format}</span>
    </div>
  );
}
