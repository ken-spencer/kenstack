import { format } from "date-fns";

export const dateFormat = (dateString: string) => {
  return format(new Date(dateString), "MMM d, yyyy, h:mm a");
};
