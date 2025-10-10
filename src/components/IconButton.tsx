import { isValidElement } from "react";

import { Button } from "@kenstack/components/ui/button";
import Tooltip from "@kenstack/components/Tooltip";
import { type ButtonProps } from "./Button";
import { LoaderCircle } from "lucide-react";
import { twMerge } from "tailwind-merge";

type IconButtonProps = ButtonProps & {
  // className?: string;
  tooltip: string;
  isPending?: boolean;
  disabled?: boolean;
  asChild?: boolean;
  // children: React.ReactElement<{ className?: string }>;
};

export default function IconButton({
  children,
  tooltip,
  isPending = false,
  disabled = false,
  asChild = false,
  ...props
}: IconButtonProps) {
  // const isSvg = isValidElement(children) && children.type === "svg";

  const childClassName =
    asChild === false && isValidElement(children)
      ? (children as React.ReactElement<{ className?: string }>).props.className
      : undefined;

  return (
    <Tooltip content={tooltip}>
      <Button
        size="icon"
        variant="ghost"
        // className={twMerge("[&>svg]:size-24", className)}
        asChild={asChild}
        disabled={disabled || isPending}
        {...props}
      >
        {isPending && asChild === false ? (
          <LoaderCircle className={twMerge(childClassName, "animate-spin")} />
        ) : (
          children
        )}
      </Button>
    </Tooltip>
  );
}
