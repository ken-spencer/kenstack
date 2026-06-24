"use client";

import * as React from "react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import { cn } from "@kenstack/lib/utils";
import { Input } from "@kenstack/forms/controls/Input";

type AnyItem = unknown;

type ComboboxContextValue = {
  clearValue: () => void;
  filteredItems: AnyItem[];
  focusInput: () => void;
  highlightedIndex: number;
  inputValue: string;
  isOpen: boolean;
  isSelected: (item: AnyItem) => boolean;
  itemToStringLabel: (item: AnyItem) => string;
  listboxId: string;
  optionId: (index: number) => string;
  rootRef: React.RefObject<HTMLDivElement | null>;
  selectItem: (item: AnyItem) => void;
  setHighlightedIndex: (index: number) => void;
  setInputElement: (node: HTMLInputElement | null) => void;
  setInputValue: (value: string) => void;
  setOpen: (open: boolean) => void;
};

type ComboboxProps<T> = Omit<React.ComponentProps<"div">, "onChange"> & {
  autoHighlight?: boolean;
  children: React.ReactNode;
  filter?: ((item: T, inputValue: string) => boolean) | null;
  inputValue?: string;
  isItemEqualToValue?: (item: T, value: T) => boolean;
  items: T[];
  itemToStringLabel?: (item: T) => string;
  onInputValueChange?: (value: string) => void;
  onItemHighlighted?: (item: T | null) => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (item: T | null) => void;
  open?: boolean;
  value?: T | null;
};

type ComboboxInputProps = Omit<React.ComponentProps<"input">, "value"> & {
  inputClassName?: string;
  showChevron?: boolean;
  showClear?: boolean;
};

type ComboboxListProps<T = AnyItem> = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  children?: React.ReactNode | ((item: T) => React.ReactNode);
};

type ComboboxItemProps<T = AnyItem> = Omit<
  React.ComponentProps<"div">,
  "value"
> & {
  disabled?: boolean;
  value: T;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function getDefaultItemLabel(item: AnyItem) {
  if (typeof item === "string") {
    return item;
  }

  if (typeof item === "number") {
    return String(item);
  }

  if (typeof item === "object" && item !== null) {
    if ("label" in item && typeof item.label === "string") {
      return item.label;
    }

    if ("name" in item && typeof item.name === "string") {
      return item.name;
    }

    if ("value" in item && typeof item.value === "string") {
      return item.value;
    }
  }

  return "";
}

function isDisabledItem(item: AnyItem) {
  return (
    typeof item === "object" &&
    item !== null &&
    "disabled" in item &&
    item.disabled === true
  );
}

function useComboboxContext(component: string) {
  const context = React.useContext(ComboboxContext);

  if (!context) {
    throw new Error(component + " must be used inside Combobox.");
  }

  return context;
}

function Combobox<T>({
  autoHighlight = false,
  children,
  className,
  filter,
  inputValue: inputValueProp,
  isItemEqualToValue = Object.is,
  items,
  itemToStringLabel = getDefaultItemLabel,
  onInputValueChange,
  onItemHighlighted,
  onBlur,
  onOpenChange,
  onValueChange,
  open: openProp,
  value = null,
  ...props
}: ComboboxProps<T>) {
  const id = React.useId();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    React.useState("");
  const [highlightedIndexState, setHighlightedIndexState] =
    React.useState(-1);
  const isOpen = openProp ?? uncontrolledOpen;
  const inputValue =
    inputValueProp ??
    (isOpen ? uncontrolledInputValue : value ? itemToStringLabel(value) : "");

  const filteredItems = React.useMemo(() => {
    if (filter === null) {
      return items;
    }

    if (filter) {
      return items.filter((item) => filter(item, inputValue));
    }

    const query = inputValue.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) =>
      itemToStringLabel(item).toLowerCase().includes(query),
    );
  }, [filter, inputValue, itemToStringLabel, items]);

  const isSelected = React.useCallback(
    (item: AnyItem) =>
      value !== null &&
      value !== undefined &&
      isItemEqualToValue(item as T, value),
    [isItemEqualToValue, value],
  );

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      if (nextOpen && inputValueProp === undefined) {
        setUncontrolledInputValue("");
      }

      if (!nextOpen) {
        setHighlightedIndexState(-1);
      }

      onOpenChange?.(nextOpen);
    },
    [inputValueProp, onOpenChange, openProp],
  );

  const setInputValue = React.useCallback(
    (nextInputValue: string) => {
      if (inputValueProp === undefined) {
        setUncontrolledInputValue(nextInputValue);
      }

      onInputValueChange?.(nextInputValue);
    },
    [inputValueProp, onInputValueChange],
  );

  const focusInput = React.useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const setInputElement = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
    },
    [],
  );

  const selectItem = React.useCallback(
    (item: AnyItem) => {
      const typedItem = item as T;

      if (isDisabledItem(typedItem)) {
        return;
      }

      setInputValue(itemToStringLabel(typedItem));
      onValueChange?.(typedItem);
      setOpen(false);
      setHighlightedIndexState(-1);
    },
    [itemToStringLabel, onValueChange, setInputValue, setOpen],
  );

  const clearValue = React.useCallback(() => {
    setInputValue("");
    onValueChange?.(null);
    setHighlightedIndexState(-1);
  }, [onValueChange, setInputValue]);
  const listboxId = id + "-listbox";
  const optionId = React.useCallback((index: number) => {
    return id + "-option-" + index;
  }, [id]);

  const highlightedIndex =
    isOpen &&
    highlightedIndexState >= 0 &&
    highlightedIndexState < filteredItems.length &&
    !isDisabledItem(filteredItems[highlightedIndexState])
      ? highlightedIndexState
      : isOpen && autoHighlight
        ? filteredItems.findIndex((item) => !isDisabledItem(item))
        : -1;

  React.useEffect(() => {
    onItemHighlighted?.(
      highlightedIndex >= 0
        ? (filteredItems[highlightedIndex] as T | undefined) ?? null
        : null,
    );
  }, [filteredItems, highlightedIndex, onItemHighlighted]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, setOpen]);

  const context = React.useMemo<ComboboxContextValue>(
    () => ({
      clearValue,
      filteredItems,
      focusInput,
      highlightedIndex,
      inputValue,
      isOpen,
      isSelected,
      itemToStringLabel: (item) => itemToStringLabel(item as T),
      listboxId,
      optionId,
      rootRef,
      selectItem,
      setHighlightedIndex: setHighlightedIndexState,
      setInputElement,
      setInputValue,
      setOpen,
    }),
    [
      clearValue,
      filteredItems,
      focusInput,
      highlightedIndex,
      inputValue,
      isOpen,
      isSelected,
      itemToStringLabel,
      listboxId,
      optionId,
      rootRef,
      selectItem,
      setInputElement,
      setInputValue,
      setOpen,
    ],
  );

  return (
    <ComboboxContext.Provider value={context}>
      <div
        data-slot="combobox-root"
        className={cn("relative min-w-0", className)}
        onBlur={(event) => {
          onBlur?.(event);

          const nextTarget = event.relatedTarget;

          if (
            !isOpen ||
            (nextTarget instanceof Node &&
              event.currentTarget.contains(nextTarget))
          ) {
            return;
          }

          setOpen(false);
        }}
        ref={rootRef}
        {...props}
      >
        {children}
      </div>
    </ComboboxContext.Provider>
  );
}

function ComboboxInputShell({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group border-input has-disabled:bg-input/50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 relative flex h-8 w-full min-w-0 items-center rounded-lg border transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        className,
      )}
      {...props}
    />
  );
}

function ComboboxInputActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align="inline-end"
      className={cn(
        "order-last flex h-auto cursor-text items-center justify-center gap-2 py-1.5 pr-2 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem] [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
        className,
      )}
      onClick={(event) => {
        const target = event.target;

        if (target instanceof HTMLElement && target.closest("button")) {
          return;
        }

        event.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

function ComboboxInputControl({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

const ComboboxInput = React.forwardRef<HTMLInputElement, ComboboxInputProps>(
  function ComboboxInput(
    {
      className,
      children,
      disabled = false,
      inputClassName,
      showChevron = true,
      showClear = false,
      onChange,
      onFocus,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) {
    const context = useComboboxContext("ComboboxInput");

    function moveHighlight(direction: 1 | -1) {
      const count = context.filteredItems.length;

      if (!count) {
        context.setHighlightedIndex(-1);
        return;
      }

      let nextIndex = context.highlightedIndex;

      for (let attempt = 0; attempt < count; attempt++) {
        nextIndex =
          nextIndex === -1
            ? direction === 1
              ? 0
              : count - 1
            : (nextIndex + direction + count) % count;

        if (!isDisabledItem(context.filteredItems[nextIndex])) {
          context.setHighlightedIndex(nextIndex);
          return;
        }
      }
    }

    return (
      <ComboboxInputShell className={cn("w-auto", className)}>
        <ComboboxInputControl
          aria-activedescendant={
            context.highlightedIndex >= 0
              ? context.optionId(context.highlightedIndex)
              : undefined
          }
          aria-autocomplete="list"
          aria-expanded={context.isOpen}
          aria-controls={context.listboxId}
          autoComplete="off"
          className={inputClassName}
          disabled={disabled}
          onChange={(event) => {
            context.setInputValue(event.currentTarget.value);
            context.setOpen(true);
            onChange?.(event);
          }}
          onFocus={(event) => {
            context.setOpen(true);
            onFocus?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);

            if (event.defaultPrevented) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              context.setOpen(true);
              moveHighlight(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              context.setOpen(true);
              moveHighlight(-1);
            } else if (event.key === "Enter") {
              if (
                context.isOpen &&
                context.highlightedIndex >= 0 &&
                context.filteredItems[context.highlightedIndex]
              ) {
                event.preventDefault();
                context.selectItem(context.filteredItems[context.highlightedIndex]);
              }
            } else if (event.key === "Escape") {
              event.preventDefault();
              context.setOpen(false);
            }
          }}
          ref={(node) => {
            context.setInputElement(node);

            if (typeof forwardedRef === "function") {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
          }}
          role="combobox"
          value={context.inputValue}
          {...props}
        />
        <ComboboxInputActions>
          {showChevron && (
            <Button
              size="icon-xs"
              variant="ghost"
              data-slot="input-group-button"
              className="shadow-none data-pressed:bg-transparent"
              disabled={disabled}
              type="button"
              onClick={() => {
                context.setOpen(!context.isOpen);
              }}
            >
              <ChevronDownIcon className="text-muted-foreground pointer-events-none size-4" />
            </Button>
          )}
          {showClear && context.inputValue ? (
            <Button
              aria-label="Clear"
              size="icon-xs"
              variant="ghost"
              data-slot="combobox-clear"
              className="shadow-none"
              disabled={disabled}
              type="button"
              onClick={() => {
                context.clearValue();
                context.focusInput();
              }}
            >
              <XIcon className="pointer-events-none" />
            </Button>
          ) : null}
        </ComboboxInputActions>
        {children}
      </ComboboxInputShell>
    );
  },
);

function ComboboxContent({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  const { isOpen, rootRef } = useComboboxContext("ComboboxContent");
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const positionContent = React.useCallback(() => {
    const root = rootRef.current;
    const content = contentRef.current;

    if (!root || !content) {
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const viewportPadding = 8;
    const sideOffset = 4;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const width = Math.min(
      rootRect.width,
      viewportWidth - viewportPadding * 2,
    );
    const left = Math.min(
      Math.max(viewportPadding, rootRect.left),
      viewportWidth - width - viewportPadding,
    );
    const top = Math.max(viewportPadding, rootRect.bottom + sideOffset);

    content.style.left = left + "px";
    content.style.maxHeight =
      Math.max(80, Math.min(288, viewportHeight - top - viewportPadding)) +
      "px";
    content.style.minWidth = width + "px";
    content.style.top = top + "px";
    content.style.width = width + "px";
  }, [rootRef]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    positionContent();
  }, [isOpen, positionContent]);

  const setContentElement = React.useCallback(
    (node: HTMLDivElement | null) => {
      contentRef.current = node;

      if (node) {
        positionContent();
      }
    },
    [positionContent],
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener("resize", positionContent);
    window.addEventListener("scroll", positionContent, true);

    return () => {
      window.removeEventListener("resize", positionContent);
      window.removeEventListener("scroll", positionContent, true);
    };
  }, [isOpen, positionContent]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      data-slot="combobox-content"
      className={cn(
        "bg-popover text-popover-foreground ring-foreground/10 fixed inset-auto z-50 m-0 overflow-hidden rounded-lg shadow-md ring-1",
        className,
      )}
      ref={setContentElement}
      style={style}
      {...props}
    />
  );
}

function ComboboxList<T = AnyItem>({
  className,
  children,
  ...props
}: ComboboxListProps<T>) {
  const { filteredItems, listboxId } = useComboboxContext("ComboboxList");

  return (
    <div
      data-slot="combobox-list"
      id={listboxId}
      role="listbox"
      className={cn(
        "no-scrollbar max-h-63 scroll-py-1 overflow-y-auto overscroll-contain p-1",
        className,
      )}
      {...props}
    >
      {typeof children === "function"
        ? filteredItems.map((item) => children(item as T))
        : children}
    </div>
  );
}

function ComboboxItem<T = AnyItem>({
  className,
  children,
  disabled = false,
  onClick,
  onMouseEnter,
  value,
  ...props
}: ComboboxItemProps<T>) {
  const context = useComboboxContext("ComboboxItem");
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const index = context.filteredItems.findIndex((item) =>
    Object.is(item, value),
  );
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
      data-slot="combobox-item"
      id={index >= 0 ? context.optionId(index) : undefined}
      role="option"
      ref={itemRef}
      className={cn(
        "border-border/45 data-highlighted:border-accent-foreground/15 data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-md border py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
      {children}
      {selected ? (
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center">
          <CheckIcon className="pointer-events-none" />
        </span>
      ) : null}
    </div>
  );
}

function ComboboxEmpty({ className, ...props }: React.ComponentProps<"div">) {
  const { filteredItems } = useComboboxContext("ComboboxEmpty");

  if (filteredItems.length > 0) {
    return null;
  }

  return (
    <div
      data-slot="combobox-empty"
      className={cn(
        "text-muted-foreground flex w-full justify-center py-2 text-center text-sm",
        className,
      )}
      {...props}
    />
  );
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
};
