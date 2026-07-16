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
      classes += "border-destructive/35 bg-destructive/10 text-destructive";
      break;
    case "success":
      Icon = CircleCheck;
      classes +=
        "border-green-500/35 bg-green-500/10 text-green-700 dark:text-green-300";

      break;
    case "information":
      Icon = CircleQuestionMark;
      classes +=
        "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300";
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
        className,
      )}
    >
      <Icon className="size-8" />
      <div className="grow">{message ?? children}</div>
    </div>
  );
};

export default Alert;
