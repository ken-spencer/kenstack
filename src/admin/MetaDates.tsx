export default function MetaDates({ meta }) {
  return (
    <div className="flex flex-col gap-1 text-xs text-gray-700 sm:flex-row sm:gap-2">
      <div>
        C: <time dateTime={meta.createdAt}>{dateFormat(meta.createdAt)}</time>
      </div>
      <div>
        U: <time dateTime={meta.updatedAt}>{dateFormat(meta.updatedAt)}</time>
      </div>
    </div>
  );
}

const dateFormat = (dateString: string) => {
  const date = new Date(dateString);
  return date
    .toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
    .replace(/\./g, "");
};
