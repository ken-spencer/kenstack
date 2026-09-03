"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { twMerge } from "tailwind-merge";

export type TooltipBreakpoint = "sm" | "md" | "lg" | "xl" | "2xl";
type TooltipSide = "top" | "right" | "bottom" | "left";

type TooltipProps = {
  children: ReactElement;
  className?: string;
  content: ReactNode;
  hidden?: boolean;
  onlyBelow?: TooltipBreakpoint;
  side?: TooltipSide;
};

type TooltipPosition = {
  side: TooltipSide;
  style: CSSProperties & { "--tooltip-stem-position": string };
};

const onlyBelowClassNames = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
  "2xl": "2xl:hidden",
} satisfies Record<TooltipBreakpoint, string>;

const stemClassNames = {
  top: "after:bg-[var(--tooltip,var(--popover))] after:border-[var(--tooltip-border,var(--border))] after:absolute after:top-full after:left-[var(--tooltip-stem-position)] after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-r after:border-b",
  right:
    "after:bg-[var(--tooltip,var(--popover))] after:border-[var(--tooltip-border,var(--border))] after:absolute after:top-[var(--tooltip-stem-position)] after:right-full after:size-2 after:translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-b after:border-l",
  bottom:
    "after:bg-[var(--tooltip,var(--popover))] after:border-[var(--tooltip-border,var(--border))] after:absolute after:bottom-full after:left-[var(--tooltip-stem-position)] after:size-2 after:-translate-x-1/2 after:translate-y-1/2 after:rotate-45 after:border-t after:border-l",
  left: "after:bg-[var(--tooltip,var(--popover))] after:border-[var(--tooltip-border,var(--border))] after:absolute after:top-[var(--tooltip-stem-position)] after:left-full after:size-2 after:-translate-x-1/2 after:-translate-y-1/2 after:rotate-45 after:border-t after:border-r",
} satisfies Record<TooltipSide, string>;

const viewportMargin = 8;
const tooltipGap = 8;
const stemMargin = 8;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function placeAlongViewport(center: number, size: number, viewportSize: number) {
  const start = clamp(
    center - size / 2,
    viewportMargin,
    viewportSize - viewportMargin - size,
  );

  return {
    start,
    stem: clamp(center - start, stemMargin, size - stemMargin),
  };
}

function getTooltipPosition(
  trigger: HTMLElement,
  tooltip: HTMLElement,
  preferredSide: TooltipSide,
): TooltipPosition {
  const rect = trigger.getBoundingClientRect();
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const horizontal = placeAlongViewport(centerX, width, window.innerWidth);
  const vertical = placeAlongViewport(centerY, height, window.innerHeight);
  const sideFits = {
    top: rect.top - tooltipGap - height >= viewportMargin,
    right:
      rect.right + tooltipGap + width <= window.innerWidth - viewportMargin,
    bottom:
      rect.bottom + tooltipGap + height <=
      window.innerHeight - viewportMargin,
    left: rect.left - tooltipGap - width >= viewportMargin,
  } satisfies Record<TooltipSide, boolean>;
  const oppositeSide = {
    top: "bottom",
    right: "left",
    bottom: "top",
    left: "right",
  } as const satisfies Record<TooltipSide, TooltipSide>;
  const opposite = oppositeSide[preferredSide];
  const side =
    !sideFits[preferredSide] && sideFits[opposite]
      ? opposite
      : preferredSide;

  switch (side) {
    case "top":
      return {
        side,
        style: {
          "--tooltip-stem-position": `${horizontal.stem}px`,
          left: horizontal.start,
          top: clamp(
            rect.top - tooltipGap - height,
            viewportMargin,
            window.innerHeight - viewportMargin - height,
          ),
        },
      };
    case "right":
      return {
        side,
        style: {
          "--tooltip-stem-position": `${vertical.stem}px`,
          left: clamp(
            rect.right + tooltipGap,
            viewportMargin,
            window.innerWidth - viewportMargin - width,
          ),
          top: vertical.start,
        },
      };
    case "bottom":
      return {
        side,
        style: {
          "--tooltip-stem-position": `${horizontal.stem}px`,
          left: horizontal.start,
          top: clamp(
            rect.bottom + tooltipGap,
            viewportMargin,
            window.innerHeight - viewportMargin - height,
          ),
        },
      };
    case "left":
      return {
        side,
        style: {
          "--tooltip-stem-position": `${vertical.stem}px`,
          left: clamp(
            rect.left - tooltipGap - width,
            viewportMargin,
            window.innerWidth - viewportMargin - width,
          ),
          top: vertical.start,
        },
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
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const showTooltip = useCallback(() => {
    setPosition(null);
    setOpen(true);
  }, []);
  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      setPosition(getTooltipPosition(triggerRef.current, tooltipRef.current, side));
    }
  }, [side]);
  const setTooltipNode = useCallback(
    (tooltip: HTMLSpanElement | null) => {
      tooltipRef.current = tooltip;
      if (tooltip && triggerRef.current) {
        setPosition(getTooltipPosition(triggerRef.current, tooltip, side));
      }
    },
    [side],
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) {
      return;
    }

    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(trigger);
    resizeObserver.observe(tooltip);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      resizeObserver.disconnect();
    };
  }, [content, open, updatePosition]);

  if (hidden) {
    return children;
  }

  return (
    <span
      className={twMerge("inline-flex", className)}
      onBlur={() => {
        setOpen(false);
      }}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={() => {
        setOpen(false);
      }}
      ref={triggerRef}
    >
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              className={twMerge(
                "pointer-events-none fixed z-50 w-max max-w-[calc(100vw-1rem)] rounded-md border border-[var(--tooltip-border,var(--border))] bg-[var(--tooltip,var(--popover))] px-3 py-1.5 text-xs text-[var(--tooltip-foreground,var(--popover-foreground))] shadow-lg shadow-black/20",
                stemClassNames[position?.side ?? side],
                onlyBelow ? onlyBelowClassNames[onlyBelow] : undefined,
              )}
              ref={setTooltipNode}
              role="tooltip"
              style={
                position?.style ?? {
                  left: 0,
                  top: 0,
                  visibility: "hidden",
                }
              }
            >
              {content}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
