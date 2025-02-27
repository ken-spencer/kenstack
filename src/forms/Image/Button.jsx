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
        "bg-black/40  hover:bg-black/60 rounded-full transition",
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
