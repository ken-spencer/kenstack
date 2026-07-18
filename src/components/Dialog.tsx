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
import { XIcon } from "lucide-react";

import { cn } from "@kenstack/lib/utils";
import { useControllableOpen, useDialogTransition } from "./overlay";
import { useOverlayStack } from "./overlayStack";

const transitionDurationMs = 200;

const DialogContext = createContext<{
  descriptionId: string;
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
} | null>(null);

type DialogTriggerChildProps = {
  "aria-disabled"?: boolean | "false" | "true";
  "data-slot"?: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
};

function Dialog({
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
    <DialogContext.Provider value={value}>{children}</DialogContext.Provider>
  );
}

function DialogTrigger({
  asChild = false,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  asChild?: boolean;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  const { open, setOpen } = useDialogContext("DialogTrigger");
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
    "data-slot": "dialog-trigger",
    "data-state": open ? "open" : "closed",
  };

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement<DialogTriggerChildProps>(child)) {
      throw new Error("DialogTrigger asChild requires a React element child.");
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

function DialogClose({
  asChild = false,
  children,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "onClick"> & {
  asChild?: boolean;
  children?: ReactNode;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}) {
  const { setOpen } = useDialogContext("DialogClose");
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

    if (!isValidElement<DialogTriggerChildProps>(child)) {
      throw new Error("DialogClose asChild requires a React element child.");
    }

    return cloneElement(child, {
      ...props,
      "data-slot": "dialog-close",
      onClick: (event: MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        handleClick(event);
      },
    });
  }

  return (
    <button
      type="button"
      {...props}
      data-slot="dialog-close"
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

function DialogContent({
  "aria-describedby": ariaDescribedBy,
  "aria-labelledby": ariaLabelledBy,
  children,
  className,
  "data-slot": dataSlot = "dialog-content",
  onCancel,
  onClick,
  onClose,
  onSubmit,
  showCloseButton = true,
  tabIndex = -1,
  ...props
}: Omit<ComponentProps<"dialog">, "open"> & {
  "data-slot"?: string;
  showCloseButton?: boolean;
}) {
  const { descriptionId, open, setOpen, titleId } =
    useDialogContext("DialogContent");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const visibleOpen = useDialogTransition(
    dialogRef,
    mounted && open,
    transitionDurationMs,
  );
  const { isTopOverlay } = useOverlayStack({
    onClose: () => setOpen(false),
    open,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Portals require a browser document after hydration.
    setMounted(true);
  }, []);

  const portalTarget = mounted ? document.body : null;

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <dialog
      aria-describedby={ariaDescribedBy ?? descriptionId}
      aria-labelledby={ariaLabelledBy ?? titleId}
      {...props}
      className={cn(
        "bg-background fixed top-[50%] left-[50%] z-50 m-0 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] scale-95 gap-4 rounded-lg border p-6 opacity-0 shadow-lg transition-[opacity,transform] duration-200 ease-out backdrop:bg-black/50 data-[state=open]:scale-100 data-[state=open]:opacity-100 sm:max-w-lg",
        className,
        "hidden open:grid",
      )}
      data-slot={dataSlot}
      data-state={visibleOpen ? "open" : "closed"}
      onCancel={(event) => {
        onCancel?.(event);
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        onClick?.(event);

        if (event.target !== event.currentTarget) {
          return;
        }

        event.stopPropagation();

        if (!event.defaultPrevented && isTopOverlay()) {
          setOpen(false);
        }
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) {
          event.stopPropagation();
          return;
        }

        onClose?.(event);

        if (open) {
          setOpen(false);
        }
      }}
      onSubmit={(event) => {
        onSubmit?.(event);
        event.stopPropagation();
      }}
      ref={dialogRef}
      tabIndex={tabIndex}
    >
      {children}
      {showCloseButton ? (
        <DialogClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
          <XIcon />
          <span className="sr-only">Close</span>
        </DialogClose>
      ) : null}
    </dialog>,
    portalTarget,
  );
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: ComponentProps<"h2">) {
  const { titleId } = useDialogContext("DialogTitle");

  return (
    <h2
      data-slot="dialog-title"
      id={props.id ?? titleId}
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: ComponentProps<"p">) {
  const { descriptionId } = useDialogContext("DialogDescription");

  return (
    <p
      data-slot="dialog-description"
      id={props.id ?? descriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function useDialogContext(component: string) {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error(component + " must be used inside Dialog.");
  }

  return context;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
