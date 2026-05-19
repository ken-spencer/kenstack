export const dateFormat = (dateString: string) => {
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
