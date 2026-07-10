"use client";

import { useCallback, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
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

const stemClassNames = {
  top: "after:absolute after:top-full after:left-1/2 after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-foreground",
  right:
    "after:absolute after:top-1/2 after:right-full after:size-2 after:translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-foreground",
  left: "after:absolute after:top-1/2 after:left-full after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:bg-foreground",
} satisfies Record<TooltipSide, string>;

function getTooltipPosition(
  trigger: HTMLElement,
  side: TooltipSide,
): CSSProperties {
  const rect = trigger.getBoundingClientRect();

  switch (side) {
    case "right":
      return {
        left: rect.right + 8,
        top: rect.top + rect.height / 2,
        transform: "translateY(-50%)",
      };
    case "left":
      return {
        left: rect.left - 8,
        top: rect.top + rect.height / 2,
        transform: "translate(-100%, -50%)",
      };
    case "top":
      return {
        left: rect.left + rect.width / 2,
        top: rect.top - 8,
        transform: "translate(-50%, -100%)",
      };
  }
}

export default function Tooltip({
  children,
  className,
  content,
  hidden = false,
  onlyBelow,
  side = "top",
}: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<CSSProperties | null>(null);
  const showTooltip = useCallback(() => {
    if (triggerRef.current) {
      setTooltipStyle(getTooltipPosition(triggerRef.current, side));
    }
  }, [side]);

  if (hidden) {
    return children;
  }

  return (
    <span
      className={twMerge("inline-flex", className)}
      onBlur={() => {
        setTooltipStyle(null);
      }}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={() => {
        setTooltipStyle(null);
      }}
      ref={triggerRef}
    >
      {children}
      {tooltipStyle && typeof document !== "undefined"
        ? createPortal(
            <span
              className={twMerge(
                "bg-foreground text-background pointer-events-none fixed z-50 w-max max-w-xs rounded-md px-3 py-1.5 text-xs shadow-sm",
                stemClassNames[side],
                onlyBelow ? onlyBelowClassNames[onlyBelow] : undefined,
              )}
              role="tooltip"
              style={tooltipStyle}
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
