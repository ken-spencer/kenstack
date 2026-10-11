import { CircleAlert, CircleCheck, CircleQuestionMark } from "lucide-react";
import { twMerge } from "tailwind-merge";

export type NoticeProps = React.ComponentProps<"div"> & {
  status?: "error" | "success" | "information";
  message?: React.ReactNode;
  // A button for the notice, such as Try again: beside the message, or below it when they don't fit.
  // The icon stays centred on the message.
  action?: React.ReactNode;
};

const Notice: React.FC<NoticeProps> = ({
  status = "error",
  message,
  action,
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
        "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-lg,0.5rem)] border p-2 transition",
        classes,
        className,
      )}
    >
      <div className="flex grow items-center gap-2">
        <Icon className="size-8 shrink-0" />
        <div className="grow">{message ?? children}</div>
      </div>
      {action}
    </div>
  );
};

export default Notice;
