import { CircleAlert, CircleCheck, CircleQuestionMark } from "lucide-react";
import { twMerge } from "tailwind-merge";

export type AlertProps = React.ComponentProps<"div"> & {
  status?: "error" | "success" | "information";
  message?: React.ReactNode;
};

const Alert: React.FC<AlertProps> = ({
  status = "error",
  message,
  className,
  children,
  ...props
}) => {
  let Icon;
  let classes = "";
  switch (status) {
    case "error":
      Icon = CircleAlert;
      classes +=
        "bg-red-100 dark:bg-red-900  border-red-400 text-red-700 dark:text-red-200";
      break;
    case "success":
      Icon = CircleCheck;
      classes +=
        "bg-green-100  border-green-400 text-green-700 dark:bg-green-900 dark:text-green-300";

      break;
    case "information":
      Icon = CircleQuestionMark;
      classes += "bg-blue-100  border-blue-400 text-blue-700 dark:bg-blue-900";
      break;
    default:
      throw Error(`Unknown notice type ${status}`);
  }
  return (
    <div
      {...props}
      className={twMerge(
        "flex items-center gap-2 rounded border p-2 transition",
        classes,
        className
      )}
    >
      <Icon className="size-8" />
      <div className="flex-grow">{message ?? children}</div>
    </div>
  );
};

export default Alert;
