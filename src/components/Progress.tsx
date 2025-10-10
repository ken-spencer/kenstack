import ProgressIcon from "@kenstack/icons/Progress";
import { twMerge } from "tailwind-merge";

export default function Progress({ className }: React.ComponentProps<"div">) {
  return (
    <div className="p- flex justify-center">
      <ProgressIcon
        className={twMerge("size-24 animate-spin text-gray-600", className)}
      />
    </div>
  );
}
