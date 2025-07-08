import React from "react";

import ErrorIcon from "@kenstack/icons/Error";
import SuccessIcon from "@kenstack/icons/CheckCircleOutline";
import InformationIcon from "@kenstack/icons/Info";

import { twMerge } from "tailwind-merge";

export type NoticeProps = React.ComponentProps<"div"> & {
  type?: "error" | "success" | "information";
};

const NoticeBase: React.FC<NoticeProps> = ({
  type = "error",
  className,
  children,
  ...props
}) => {
  let Icon;
  let classes = "";
  switch (type) {
    case "error":
      Icon = ErrorIcon;
      classes +=
        "bg-red-100 dark:bg-red-900  border-red-400 text-red-700 dark:text-red-200";
      break;
    case "success":
      Icon = SuccessIcon;
      classes +=
        "bg-green-100  border-green-400 text-green-700 dark:bg-green-900 dark:text-green-300";

      break;
    case "information":
      Icon = InformationIcon;
      classes += "bg-blue-100  border-blue-400 text-blue-700 dark:bg-blue-900";
      break;
    default:
      throw Error(`Unknown notice type ${type}`);
  }
  return (
    <div
      {...props}
      className={twMerge(
        "notice flex items-center gap-2 transition p-2 border rounded",
        classes,
        className
      )}
    >
      <Icon className="w-8 h-8" />
      <div className="flex-grow">{children}</div>
    </div>
  );
};

export default NoticeBase;
