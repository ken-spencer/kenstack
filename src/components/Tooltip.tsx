"use client";

import type { ReactElement, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type TooltipBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl";
type TooltipSide = "top" | "right" | "left";

type TooltipProps = {
  children: ReactElement;
  className?: string;
  content: ReactNode;
  hidden?: boolean;
  onlyBelow?: TooltipBreakpoint;
  side?: TooltipSide;
};

const onlyBelowClassNames = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
  "2xl": "2xl:hidden",
} satisfies Record<TooltipBreakpoint, string>;

const sideClassNames = {
  top: "bottom-full left-1/2 mb-1 -translate-x-1/2 translate-y-1 group-hover/tooltip:translate-y-0",
  right:
    "top-1/2 left-full ml-1 -translate-y-1/2 -translate-x-1 group-hover/tooltip:translate-x-0",
  left: "top-1/2 right-full mr-1 -translate-y-1/2 translate-x-1 group-hover/tooltip:translate-x-0",
} satisfies Record<TooltipSide, string>;

const stemClassNames = {
  top: "after:absolute after:top-full after:left-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-foreground",
  right:
    "after:absolute after:top-1/2 after:right-full after:size-2 after:translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-foreground",
  left: "after:absolute after:top-1/2 after:left-full after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-foreground",
} satisfies Record<TooltipSide, string>;

export default function Tooltip({
  children,
  className,
  content,
  hidden = false,
  onlyBelow,
  side = "top",
}: TooltipProps) {
  if (hidden) {
    return children;
  }

  return (
    <span className={twMerge("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        className={twMerge(
          "pointer-events-none absolute z-50 w-max max-w-xs scale-95 rounded-md bg-foreground px-3 py-1.5 text-xs text-background opacity-0 shadow-sm transition-[opacity,transform] delay-0 duration-150 ease-out group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 group-hover/tooltip:delay-500",
          sideClassNames[side],
          stemClassNames[side],
          onlyBelow ? onlyBelowClassNames[onlyBelow] : undefined,
        )}
      >
        {content}
      </span>
    </span>
  );
}
