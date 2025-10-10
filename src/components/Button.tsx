import { Button, buttonVariants } from "./ui/button";
import ProgressIcon from "@kenstack/icons/Progress";

import { twMerge } from "tailwind-merge";

import { type VariantProps } from "class-variance-authority";
export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    isPending?: boolean;
    asChild?: boolean;
  };

export default function ButtonGR({
  isPending = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <Button
      className={twMerge(
        "relative cursor-pointer",
        isPending && "disabled:opacity-100",
        className
      )}
      disabled={disabled || isPending}
      {...props}
    >
      <span
        className={
          "absolute inset-0 flex items-center justify-center" +
          (isPending ? "" : " hidden")
        }
      >
        <ProgressIcon className={"animate-spin"} />
      </span>
      <span className={isPending ? "opacity-25" : ""}>{children}</span>
    </Button>
  );
}
