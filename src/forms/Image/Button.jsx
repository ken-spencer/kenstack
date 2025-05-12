import { useMemo } from "react";
import { twMerge } from "tailwind-merge";
import AdminIcon from "@kenstack/components/AdminIcon";

export default function Button({
  component = "button",
  className,
  children,
  ...props
}) {
  const classes = useMemo(
    () =>
      twMerge(
        "bg-gray-200/60  hover:bg-gray-300/60 border z-50 rounded-full transition",
        className,
      ),
    [className],
  );

  if (component === "button" && !props.type) {
    props.type = "button";
  }
  return (
    <AdminIcon className={classes} component={component} {...props}>
      {children}
    </AdminIcon>
  );
}
