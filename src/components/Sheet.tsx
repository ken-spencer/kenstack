"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from "react";
import { XIcon } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import { cn } from "@kenstack/lib/utils";
import { useControllableOpen, useDialogTransition } from "./overlay";
import { useOverlayStack } from "./overlayStack";

const transitionDurationMs = 200;

const SheetContext = createContext<{
  descriptionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
} | null>(null);

type SheetChildProps = {
  "aria-disabled"?: boolean | "false" | "true";
  "data-slot"?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

function Sheet({
  children,
  defaultOpen = false,
  onOpenChange,
  open: openProp,
}: {
  children?: ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useControllableOpen({
    defaultOpen,
    onOpenChange,
    open: openProp,
  });
  const value = useMemo(
    () => ({ descriptionId, open, setOpen, titleId }),
    [descriptionId, open, setOpen, titleId],
  );

  return (
    <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
  );
}

function SheetTrigger({
  asChild = false,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  asChild?: boolean;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  const { open, setOpen } = useSheetContext("SheetTrigger");
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        setOpen(true);
      }
    },
    [onClick, setOpen],
  );
  const sharedProps = {
    "aria-expanded": open,
    "aria-haspopup": "dialog" as const,
    "data-slot": "sheet-trigger",
    "data-state": open ? "open" : "closed",
  };

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement<SheetChildProps>(child)) {
      throw new Error("SheetTrigger asChild requires a React element child.");
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

function SheetClose({
  asChild = false,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  asChild?: boolean;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  const { setOpen } = useSheetContext("SheetClose");
  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      onClick?.(event);

      if (!event.defaultPrevented) {
        setOpen(false);
      }
    },
    [onClick, setOpen],
  );

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement<SheetChildProps>(child)) {
      throw new Error("SheetClose asChild requires a React element child.");
    }

    return cloneElement(child, {
      ...props,
      "data-slot": "sheet-close",
      onClick: (event: MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);

        if (!event.defaultPrevented) {
          handleClick(event);
        }
      },
    });
  }

  return (
    <button
      type="button"
      {...props}
      data-slot="sheet-close"
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

function SheetContent({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  "data-slot": dataSlot = "sheet-content",
  onCancel,
  onClick,
  onClose,
  side = "right",
  showCloseButton = true,
  tabIndex = -1,
  ...props
}: Omit<ComponentProps<"dialog">, "open"> & {
  "data-slot"?: string;
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  const { descriptionId, open, setOpen, titleId } =
    useSheetContext("SheetContent");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const visibleOpen = useDialogTransition(
    dialogRef,
    open,
    transitionDurationMs,
  );
  const { isTopOverlay } = useOverlayStack({
    onClose: () => {
      const dialog = dialogRef.current;

      if (!dialog?.open) {
        return;
      }

      const cancelEvent = new Event("cancel", { cancelable: true });
      dialog.dispatchEvent(cancelEvent);

      if (!cancelEvent.defaultPrevented) {
        setOpen(false);
      }
    },
    open,
  });

  return (
    <dialog
      aria-describedby={ariaDescribedBy ?? descriptionId}
      aria-labelledby={ariaLabelledBy ?? titleId}
      {...props}
      className={cn(
        "bg-background fixed z-50 m-0 max-h-none flex-col gap-4 bg-clip-padding p-0 text-sm opacity-0 shadow-lg transition-[opacity,transform] duration-200 ease-in-out backdrop:bg-black/10 backdrop:backdrop-blur-xs data-[state=open]:opacity-100",
        side === "left" &&
          "inset-y-0 left-0 h-full w-3/4 max-w-sm -translate-x-full border-r data-[state=open]:translate-x-0",
        side === "right" &&
          "inset-y-0 right-0 h-full w-3/4 max-w-sm translate-x-full border-l data-[state=open]:translate-x-0",
        side === "top" &&
          "inset-x-0 top-0 h-auto w-full -translate-y-full border-b data-[state=open]:translate-y-0",
        side === "bottom" &&
          "inset-x-0 bottom-0 h-auto w-full translate-y-full border-t data-[state=open]:translate-y-0",
        className,
        "hidden open:flex",
      )}
      data-side={side}
      data-slot={dataSlot}
      data-state={visibleOpen ? "open" : "closed"}
      onCancel={(event) => {
        onCancel?.(event);

        if (!event.defaultPrevented) {
          event.preventDefault();
          setOpen(false);
        }
      }}
      onClick={(event) => {
        onClick?.(event);

        if (
          !event.defaultPrevented &&
          event.target === event.currentTarget &&
          isTopOverlay()
        ) {
          setOpen(false);
        }
      }}
      onClose={(event) => {
        onClose?.(event);

        if (open) {
          setOpen(false);
        }
      }}
      ref={dialogRef}
      tabIndex={tabIndex}
    >
      {children}
      {showCloseButton ? (
        <SheetClose asChild>
          <Button
            variant="ghost"
            className="absolute top-3 right-3"
            size="icon-sm"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </SheetClose>
      ) : null}
    </dialog>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: ComponentProps<"h2">) {
  const { titleId } = useSheetContext("SheetTitle");

  return (
    <h2
      data-slot="sheet-title"
      id={props.id ?? titleId}
      className={cn("text-foreground text-base font-medium", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: ComponentProps<"p">) {
  const { descriptionId } = useSheetContext("SheetDescription");

  return (
    <p
      data-slot="sheet-description"
      id={props.id ?? descriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function useSheetContext(component: string) {
  const context = useContext(SheetContext);

  if (!context) {
    throw new Error(component + " must be used inside Sheet.");
  }

  return context;
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
