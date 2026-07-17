"use client";

// Keep this primitive backed by native <dialog> top-layer behavior. Nested
// Escape handling belongs in useOverlayStack, not in ad hoc overlay rewrites.

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@kenstack/lib/utils";
import { useOverlayStack } from "./overlayStack";

const transitionDurationMs = 150;

const PopoverContext = createContext<{
  contentId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

type PopoverTriggerChildProps = {
  "aria-disabled"?: boolean | "false" | "true";
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

function Popover({
  children,
  onOpenChange,
  open: openProp,
}: {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const contentId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp],
  );
  const value = useMemo(
    () => ({ contentId, open, setOpen }),
    [contentId, open, setOpen],
  );

  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}

function PopoverTrigger({
  asChild = false,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  asChild?: boolean;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  const { contentId, open, setOpen } = usePopoverContext("PopoverTrigger");
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);

      if (event.defaultPrevented) {
        return;
      }

      setOpen(!open);
    },
    [onClick, open, setOpen],
  );
  const sharedProps = {
    "aria-controls": contentId,
    "aria-expanded": open,
    "data-slot": "popover-trigger",
    "data-state": open ? "open" : "closed",
  };

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement<PopoverTriggerChildProps>(child)) {
      throw new Error("PopoverTrigger asChild requires a React element child.");
    }

    return cloneElement(child, {
      ...props,
      ...sharedProps,
      onClick: (event: MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);

        if (
          event.defaultPrevented ||
          child.props.disabled ||
          child.props["aria-disabled"] === true ||
          child.props["aria-disabled"] === "true"
        ) {
          return;
        }

        handleClick(event);
      },
    });
  }

  return (
    <button type="button" {...props} {...sharedProps} onClick={handleClick}>
      {children}
    </button>
  );
}

function PopoverContent({
  align = "center",
  autoFocus = true,
  children,
  className,
  onEscape,
  sideOffset = 4,
  tabIndex = -1,
  ...props
}: Omit<ComponentProps<"dialog">, "open"> & {
  align?: "center" | "end" | "start";
  autoFocus?: boolean;
  onEscape?: () => void;
  sideOffset?: number;
}) {
  const { contentId, open, setOpen } = usePopoverContext("PopoverContent");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visibleOpen, setVisibleOpen] = useState(false);
  const { isTopOverlay } = useOverlayStack({
    onClose: () => {
      onEscape?.();
      setOpen(false);
    },
    open,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Portals require a browser document after hydration.
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!open) {
      if (!dialog.open) {
        setVisibleOpen(false);
        return;
      }

      setVisibleOpen(false);

      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        dialog.close();
      }, transitionDurationMs);
      return;
    }

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    positionDialog(dialog, contentId, align, sideOffset);
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      positionDialog(dialog, contentId, align, sideOffset);
      setVisibleOpen(true);
    });

    if (autoFocus) {
      dialog.focus({ preventScroll: true });
    }
  }, [align, autoFocus, contentId, mounted, open, sideOffset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePositionChange() {
      const dialog = dialogRef.current;

      if (dialog?.open) {
        positionDialog(dialog, contentId, align, sideOffset);
      }
    }

    window.addEventListener("resize", handlePositionChange);
    window.addEventListener("scroll", handlePositionChange, true);

    return () => {
      window.removeEventListener("resize", handlePositionChange);
      window.removeEventListener("scroll", handlePositionChange, true);
    };
  }, [align, contentId, open, sideOffset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        getTriggerElement(contentId)?.contains(target) ||
        dialogRef.current?.contains(target)
      ) {
        return;
      }

      if (!isTopOverlay()) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [contentId, isTopOverlay, open, setOpen]);

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const portalTarget = mounted ? document.body : null;

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <dialog
      {...props}
      className={cn(
        "border-border bg-popover text-popover-foreground fixed inset-auto z-50 m-0 max-h-[calc(100dvh-1rem)] w-72 scale-95 overflow-auto rounded-md border p-4 opacity-0 shadow-md outline-hidden transition-[opacity,transform] duration-150 ease-out backdrop:bg-transparent data-[state=open]:scale-100 data-[state=open]:opacity-100",
        className,
        "hidden open:block",
      )}
      data-side="bottom"
      data-slot="popover-content"
      data-state={visibleOpen ? "open" : "closed"}
      id={contentId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        props.onClick?.(event);

        if (event.target !== event.currentTarget) {
          return;
        }

        if (!event.defaultPrevented && isTopOverlay()) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }}
      onClose={(event) => {
        event.stopPropagation();

        if (event.target !== event.currentTarget) {
          return;
        }

        props.onClose?.(event);

        if (open) {
          setOpen(false);
        }
      }}
      ref={dialogRef}
      tabIndex={tabIndex}
    >
      {children}
    </dialog>,
    portalTarget,
  );
}

function usePopoverContext(component: string) {
  const context = useContext(PopoverContext);

  if (!context) {
    throw new Error(component + " must be used inside Popover.");
  }

  return context;
}

function positionDialog(
  dialog: HTMLDialogElement,
  contentId: string,
  align: "center" | "end" | "start",
  sideOffset: number,
) {
  const trigger = getTriggerElement(contentId);

  if (!trigger) {
    return;
  }

  const triggerRect = trigger.getBoundingClientRect();
  const dialogRect = dialog.getBoundingClientRect();
  const viewportPadding = 8;
  const viewportWidth = document.documentElement.clientWidth;
  const left =
    align === "end"
      ? triggerRect.right - dialogRect.width
      : align === "center"
        ? triggerRect.left + triggerRect.width / 2 - dialogRect.width / 2
        : triggerRect.left;

  dialog.style.position = "fixed";
  dialog.style.inset = "auto";
  dialog.style.right = "auto";
  dialog.style.bottom = "auto";
  dialog.style.margin = "0";
  dialog.style.left =
    Math.min(
      Math.max(viewportPadding, left),
      viewportWidth - dialogRect.width - viewportPadding,
    ) + "px";
  dialog.style.top =
    Math.max(viewportPadding, triggerRect.bottom + sideOffset) + "px";
  dialog.style.setProperty("--popover-trigger-width", triggerRect.width + "px");
  dialog.style.setProperty(
    "--popover-trigger-height",
    triggerRect.height + "px",
  );

  const adjustedRect = dialog.getBoundingClientRect();
  const adjustedLeft = Math.min(
    Math.max(viewportPadding, adjustedRect.left),
    viewportWidth - adjustedRect.width - viewportPadding,
  );

  dialog.style.left = adjustedLeft + "px";
}

function getTriggerElement(contentId: string) {
  for (const element of document.querySelectorAll<HTMLElement>(
    "[aria-controls]",
  )) {
    if (element.getAttribute("aria-controls") === contentId) {
      return element;
    }
  }

  return null;
}

export { Popover, PopoverTrigger, PopoverContent };
