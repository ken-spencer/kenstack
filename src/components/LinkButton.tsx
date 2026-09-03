import NextLink from "next/link";
import type { ComponentProps } from "react";
import { twMerge } from "tailwind-merge";

import { buttonVariants, type ButtonProps } from "./Button";

export type LinkButtonProps = ComponentProps<typeof NextLink> &
  Pick<ButtonProps, "icon" | "iconPosition" | "size" | "variant">;

export function LinkButton({
  children,
  className,
  icon: Icon,
  iconPosition = "start",
  size = "default",
  variant = "default",
  ...props
}: LinkButtonProps) {
  const icon = Icon ? (
    <Icon
      className="size-4"
      data-icon={iconPosition === "end" ? "inline-end" : "inline-start"}
    />
  ) : null;

  return (
    <NextLink
      className={twMerge(
        "relative",
        buttonVariants({ size, variant }),
        className,
      )}
      {...props}
    >
      <span
        className="inline-flex items-center justify-center gap-1.5"
        data-slot="link-button-content"
      >
        {iconPosition === "start" ? icon : null}
        {children}
        {iconPosition === "end" ? icon : null}
      </span>
    </NextLink>
  );
}
