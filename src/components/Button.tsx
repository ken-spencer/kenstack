import { Button, buttonVariants } from "./ui/button";
import ProgressIcon from "@kenstack/icons/Progress";

import { twMerge } from "tailwind-merge";

import { type VariantProps } from "class-variance-authority";
export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    isPending?: boolean;
    asChild?: boolean;
    icon?: React.ComponentType<React.ComponentProps<"svg">>;
    iconPosition?: "start" | "end";
  };

export default function ButtonGR({
  icon: Icon,
  iconPosition = "start",
  isPending = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  const ButtonIcon = isPending && Icon ? ProgressIcon : Icon;
  const icon = ButtonIcon ? (
    <ButtonIcon
      className={twMerge("size-4", isPending && "animate-spin")}
      data-icon={iconPosition === "end" ? "inline-end" : "inline-start"}
    />
  ) : null;
  const showOverlayPending = isPending && !Icon;

  return (
    <Button
      className={twMerge(
        "relative cursor-pointer",
        isPending && "disabled:opacity-100",
        className,
      )}
      disabled={disabled || isPending}
      {...props}
    >
      {showOverlayPending ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <ProgressIcon className="animate-spin" />
        </span>
      ) : null}
      <span
        className={twMerge(
          "inline-flex items-center justify-center gap-1.5",
          showOverlayPending && "opacity-25",
        )}
      >
        {iconPosition === "start" ? icon : null}
        {children}
        {iconPosition === "end" ? icon : null}
      </span>
    </Button>
  );
}
