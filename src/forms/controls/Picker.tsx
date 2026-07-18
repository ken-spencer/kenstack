"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "lucide-react";

import { useOverlayStack } from "@kenstack/components/overlayStack";
import { cn } from "@kenstack/lib/utils";

type AnyItem = unknown;

type PickerContextValue = {
  contentRef: React.RefObject<HTMLDivElement | null>;
  dropdownSide: "bottom" | "top";
  highlightedIndex: number;
  isItemDisabled: (item: AnyItem) => boolean;
  isOpen: boolean;
  isSelected: (item: AnyItem) => boolean;
  items: readonly AnyItem[];
  moveHighlight: (direction: 1 | -1, initialIndex: number) => void;
  pickerListId: string;
  optionId: (index: number) => string;
  portalTarget: HTMLElement | null;
  rootRef: React.RefObject<HTMLDivElement | null>;
  selectItem: (item: AnyItem) => void;
  setDropdownSide: (side: "bottom" | "top") => void;
  setHighlightedIndex: (index: number) => void;
  setOpen: (open: boolean) => void;
};

type PickerProps<T> = Omit<React.ComponentProps<"div">, "onChange"> & {
  autoHighlight?: boolean;
  children: React.ReactNode;
  isItemDisabled?: (item: T) => boolean;
  isItemEqualToValue?: (item: T, value: T) => boolean;
  items: readonly T[];
  onItemHighlighted?: (item: T | null) => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (item: T | null) => void;
  open?: boolean;
  value?: T | null;
};

type PickerTriggerProps = React.ComponentPropsWithRef<"button">;

type PickerListProps<T = AnyItem> = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  children?: React.ReactNode | ((item: T) => React.ReactNode);
};

type PickerItemProps<T = AnyItem> = Omit<
  React.ComponentProps<"div">,
  "value"
> & {
  checkPosition?: "left" | "right" | "none";
  value: T;
};

const PickerContext = React.createContext<PickerContextValue | null>(null);

function isDisabledByProperty(item: AnyItem) {
  return (
    typeof item === "object" &&
    item !== null &&
    "disabled" in item &&
    item.disabled === true
  );
}

function usePickerContext(component: string) {
  const context = React.useContext(PickerContext);

  if (!context) {
    throw new Error(component + " must be used inside Picker.");
  }

  return context;
}

function Picker<T>({
  autoHighlight = false,
  children,
  className,
  isItemDisabled = isDisabledByProperty,
  isItemEqualToValue = Object.is,
  items,
  onBlur,
  onItemHighlighted,
  onOpenChange,
  onValueChange,
  open: openProp,
  value = null,
  ...props
}: PickerProps<T>) {
  const id = React.useId();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(
    null,
  );
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [dropdownSide, setDropdownSideState] = React.useState<"bottom" | "top">(
    "bottom",
  );
  const [highlightedIndexState, setHighlightedIndexState] = React.useState(-1);
  const isOpen = openProp ?? uncontrolledOpen;

  const updatePortalTarget = React.useCallback(() => {
    const node = rootRef.current;

    setPortalTarget(
      node ? (node.closest("dialog[open]") ?? node.ownerDocument.body) : null,
    );
  }, []);

  const isSelected = React.useCallback(
    (item: AnyItem) =>
      value !== null &&
      value !== undefined &&
      isItemEqualToValue(item as T, value),
    [isItemEqualToValue, value],
  );

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        updatePortalTarget();
      }

      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      if (!nextOpen) {
        setHighlightedIndexState(-1);
      }

      onOpenChange?.(nextOpen);
    },
    [onOpenChange, openProp, updatePortalTarget],
  );

  const selectItem = React.useCallback(
    (item: AnyItem) => {
      const typedItem = item as T;

      if (isItemDisabled(typedItem)) {
        return;
      }

      onValueChange?.(typedItem);
      setOpen(false);
      setHighlightedIndexState(-1);
    },
    [isItemDisabled, onValueChange, setOpen],
  );

  const setDropdownSide = React.useCallback((side: "bottom" | "top") => {
    setDropdownSideState((current) => (current === side ? current : side));
  }, []);
  const pickerListId = id + "-listbox";
  const optionId = React.useCallback(
    (index: number) => {
      return id + "-option-" + index;
    },
    [id],
  );

  const highlightedIndex =
    isOpen &&
    highlightedIndexState >= 0 &&
    highlightedIndexState < items.length &&
    !isItemDisabled(items[highlightedIndexState])
      ? highlightedIndexState
      : isOpen && autoHighlight
        ? items.findIndex((item) => !isItemDisabled(item))
        : -1;

  const moveHighlight = React.useCallback(
    (direction: 1 | -1, initialIndex: number) => {
      const count = items.length;

      if (!count) {
        setHighlightedIndexState(-1);
        return;
      }

      let nextIndex = highlightedIndex;
      const indexOffset =
        dropdownSide === "top" && nextIndex !== -1 ? -direction : direction;

      for (let attempt = 0; attempt < count; attempt++) {
        nextIndex =
          nextIndex === -1
            ? initialIndex
            : (nextIndex + indexOffset + count) % count;

        if (!isItemDisabled(items[nextIndex] as T)) {
          setHighlightedIndexState(nextIndex);
          return;
        }
      }
    },
    [dropdownSide, highlightedIndex, isItemDisabled, items],
  );

  useOverlayStack({
    onClose: () => setOpen(false),
    open: isOpen,
  });

  const setRootElement = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      updatePortalTarget();
    },
    [updatePortalTarget],
  );

  React.useEffect(() => {
    onItemHighlighted?.(
      highlightedIndex >= 0 ? ((items[highlightedIndex] as T) ?? null) : null,
    );
  }, [highlightedIndex, items, onItemHighlighted]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        (rootRef.current?.contains(target) ||
          contentRef.current?.contains(target))
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, setOpen]);

  const context = React.useMemo<PickerContextValue>(
    () => ({
      contentRef,
      dropdownSide,
      highlightedIndex,
      isItemDisabled: (item) => isItemDisabled(item as T),
      isOpen,
      isSelected,
      items,
      moveHighlight,
      pickerListId,
      optionId,
      portalTarget,
      rootRef,
      selectItem,
      setDropdownSide,
      setHighlightedIndex: setHighlightedIndexState,
      setOpen,
    }),
    [
      dropdownSide,
      highlightedIndex,
      isItemDisabled,
      isOpen,
      isSelected,
      items,
      moveHighlight,
      pickerListId,
      optionId,
      portalTarget,
      selectItem,
      setDropdownSide,
      setOpen,
    ],
  );

  return (
    <PickerContext.Provider value={context}>
      <div
        data-slot="picker-root"
        className={cn("relative min-w-0", className)}
        onBlur={(event) => {
          onBlur?.(event);

          const nextTarget = event.relatedTarget;

          if (
            !isOpen ||
            (nextTarget instanceof Node &&
              (event.currentTarget.contains(nextTarget) ||
                contentRef.current?.contains(nextTarget)))
          ) {
            return;
          }

          setOpen(false);
        }}
        ref={setRootElement}
        {...props}
      >
        {children}
      </div>
    </PickerContext.Provider>
  );
}

function PickerTrigger({
  disabled = false,
  onClick,
  onKeyDown,
  ref,
  ...props
}: PickerTriggerProps) {
  const context = usePickerContext("PickerTrigger");
  const selectedIndex = Math.max(
    context.items.findIndex((item) => context.isSelected(item)),
    0,
  );

  return (
    <button
      {...props}
      aria-activedescendant={
        context.highlightedIndex >= 0
          ? context.optionId(context.highlightedIndex)
          : undefined
      }
      aria-controls={context.pickerListId}
      aria-expanded={context.isOpen}
      aria-haspopup="listbox"
      disabled={disabled}
      ref={ref}
      type="button"
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && !disabled) {
          context.setHighlightedIndex(selectedIndex);
          context.setOpen(!context.isOpen);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);

        if (event.defaultPrevented || disabled) {
          return;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          context.setOpen(true);
          context.moveHighlight(1, selectedIndex);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          context.setOpen(true);
          context.moveHighlight(-1, selectedIndex);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();

          if (
            context.isOpen &&
            context.highlightedIndex >= 0 &&
            context.items[context.highlightedIndex]
          ) {
            context.selectItem(context.items[context.highlightedIndex]);
          } else {
            context.setHighlightedIndex(selectedIndex);
            context.setOpen(true);
          }
        } else if (event.key === "Escape") {
          event.preventDefault();
          context.setOpen(false);
        }
      }}
    />
  );
}

function PickerContent({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  const {
    contentRef,
    dropdownSide,
    isOpen,
    portalTarget,
    rootRef,
    setDropdownSide,
  } = usePickerContext("PickerContent");

  const updateContentPosition = React.useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    const target = portalTarget ?? root?.ownerDocument.body;

    if (!root || !content || !target) {
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const targetRect =
      target instanceof HTMLDialogElement
        ? target.getBoundingClientRect()
        : { left: 0, top: 0 };
    const targetScroll =
      target instanceof HTMLDialogElement
        ? { left: target.scrollLeft, top: target.scrollTop }
        : { left: 0, top: 0 };
    const viewportPadding = 8;
    const sideOffset = 4;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const spaceBelow =
      viewportHeight - rootRect.bottom - sideOffset - viewportPadding;
    const spaceAbove = rootRect.top - sideOffset - viewportPadding;
    const desiredHeight = Math.min(288, content.scrollHeight || 288);
    const nextSide =
      spaceBelow < desiredHeight && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableHeight = nextSide === "top" ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(80, Math.min(288, availableHeight));
    const height = Math.min(content.scrollHeight || maxHeight, maxHeight);
    const width = Math.min(rootRect.width, viewportWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rootRect.left),
      viewportWidth - width - viewportPadding,
    );
    const topViewport =
      nextSide === "top"
        ? Math.max(viewportPadding, rootRect.top - sideOffset - height)
        : Math.max(viewportPadding, rootRect.bottom + sideOffset);

    setDropdownSide(nextSide);
    content.dataset.side = nextSide;
    content.style.left = left - targetRect.left + targetScroll.left + "px";
    content.style.maxHeight = maxHeight + "px";
    content.style.minWidth = width + "px";
    content.style.position =
      target instanceof HTMLDialogElement ? "absolute" : "fixed";
    content.style.top = topViewport - targetRect.top + targetScroll.top + "px";
    content.style.width = width + "px";
  }, [contentRef, portalTarget, rootRef, setDropdownSide]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateContentPosition();
  }, [isOpen, updateContentPosition]);

  const setContentElement = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;

      if (node) {
        updateContentPosition();
      }
    },
    [contentRef, updateContentPosition],
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener("resize", updateContentPosition);
    window.addEventListener("scroll", updateContentPosition, true);

    return () => {
      window.removeEventListener("resize", updateContentPosition);
      window.removeEventListener("scroll", updateContentPosition, true);
    };
  }, [isOpen, updateContentPosition]);

  if (!isOpen) {
    return null;
  }

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      data-slot="picker-content"
      className={cn(
        "bg-popover text-popover-foreground ring-foreground/10 dark:ring-border inset-auto z-50 m-0 overflow-hidden rounded-lg shadow-md ring-1",
        className,
      )}
      data-side={dropdownSide}
      ref={setContentElement}
      style={style}
      {...props}
    />,
    portalTarget,
  );
}

function PickerList<T = AnyItem>({
  className,
  children,
  ...props
}: PickerListProps<T>) {
  const { dropdownSide, items, pickerListId } = usePickerContext("PickerList");

  // PickerContent clips overflow; the list owns wheel and keyboard scrolling.
  return (
    <div
      data-slot="picker-list"
      id={pickerListId}
      role="listbox"
      className={cn(
        "no-scrollbar max-h-63 scroll-py-1 overflow-y-auto overscroll-contain p-1 data-[side=top]:flex data-[side=top]:flex-col-reverse",
        className,
      )}
      data-side={dropdownSide}
      {...props}
    >
      {typeof children === "function"
        ? items.map((item) => children(item as T))
        : children}
    </div>
  );
}

function PickerItem<T = AnyItem>({
  checkPosition = "right",
  className,
  children,
  onClick,
  onMouseEnter,
  value,
  ...props
}: PickerItemProps<T>) {
  const context = usePickerContext("PickerItem");
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const index = context.items.findIndex((item) => Object.is(item, value));
  const disabled = context.isItemDisabled(value);
  const highlighted = index === context.highlightedIndex;
  const selected = context.isSelected(value);

  React.useEffect(() => {
    if (highlighted) {
      itemRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  return (
    <div
      aria-disabled={disabled || undefined}
      aria-selected={selected}
      data-disabled={disabled ? "" : undefined}
      data-highlighted={highlighted ? "" : undefined}
      data-slot="picker-item"
      id={index >= 0 ? context.optionId(index) : undefined}
      role="option"
      ref={itemRef}
      className={cn(
        "border-border/45 data-highlighted:border-accent-foreground/15 data-highlighted:bg-accent data-highlighted:text-accent-foreground dark:data-highlighted:border-accent-foreground/20 relative flex w-full cursor-pointer items-center gap-2 rounded-md border py-1 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        checkPosition === "right" ? "pr-8" : "pr-1.5",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);

        if (!event.defaultPrevented && !disabled) {
          context.selectItem(value);
        }
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onMouseEnter={(event) => {
        if (index >= 0 && !disabled) {
          context.setHighlightedIndex(index);
        }

        onMouseEnter?.(event);
      }}
      {...props}
    >
      {checkPosition === "left" ? (
        <span className="pointer-events-none flex size-4 shrink-0 items-center justify-center">
          {selected ? <CheckIcon className="pointer-events-none" /> : null}
        </span>
      ) : null}
      {children}
      {selected && checkPosition === "right" ? (
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          <CheckIcon className="pointer-events-none" />
        </span>
      ) : null}
    </div>
  );
}

function PickerEmpty({ className, ...props }: React.ComponentProps<"div">) {
  const { items } = usePickerContext("PickerEmpty");

  if (items.length > 0) {
    return null;
  }

  return (
    <div
      data-slot="picker-empty"
      className={cn(
        "text-muted-foreground flex w-full justify-center py-2 text-center text-sm",
        className,
      )}
      {...props}
    />
  );
}

export {
  Picker,
  PickerTrigger,
  PickerContent,
  PickerList,
  PickerItem,
  PickerEmpty,
  usePickerContext,
};
