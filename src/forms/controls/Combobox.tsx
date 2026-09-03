"use client";

import * as React from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import { cn } from "@kenstack/lib/utils";
import { Input } from "@kenstack/forms/controls/Input";
import {
  Picker,
  PickerContent,
  PickerEmpty,
  PickerItem,
  PickerList,
  usePickerContext,
} from "@kenstack/forms/controls/Picker";
import type { SelectOption } from "@kenstack/forms/controls/Select";

type ComboboxInputContextValue = {
  clearValue: () => void;
  commitInputValue?: (value: string) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
};

type ComboboxRootProps<T extends SelectOption = SelectOption> = Omit<
  React.ComponentProps<"div">,
  "onChange"
> & {
  autoHighlight?: boolean;
  children: React.ReactNode;
  filter?: ((item: T, inputValue: string) => boolean) | null;
  inputValue?: string;
  isItemDisabled?: (item: T) => boolean;
  items: readonly T[];
  onInputCommit?: (value: string) => void;
  onInputValueChange?: (value: string) => void;
  onItemHighlighted?: (item: T | null) => void;
  onOpenChange?: (open: boolean) => void;
  onValueChange?: (value: string, item: T | null) => void;
  open?: boolean;
  value?: string;
};

type ComboboxInputProps = Omit<
  React.ComponentPropsWithRef<"input">,
  "value"
> & {
  inputClassName?: string;
  showChevron?: boolean;
  showClear?: boolean;
};

const ComboboxInputContext =
  React.createContext<ComboboxInputContextValue | null>(null);

function isOptionMatch(option: SelectOption, inputValue: string) {
  const query = inputValue.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [option.label, option.value, ...(option.keywords ?? [])].some(
    (value) => value.toLowerCase().includes(query),
  );
}

function useComboboxInputContext(component: string) {
  const context = React.useContext(ComboboxInputContext);

  if (!context) {
    throw new Error(component + " must be used inside Combobox.");
  }

  return context;
}

function ComboboxRoot<T extends SelectOption>({
  autoHighlight = true,
  children,
  filter,
  inputValue: inputValueProp,
  items,
  onInputCommit,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  open: openProp,
  value = "",
  ...props
}: ComboboxRootProps<T>) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    React.useState("");
  const isOpen = openProp ?? uncontrolledOpen;
  const selectedItem = items.find((item) => item.value === value) ?? null;
  const inputValue =
    inputValueProp ??
    (isOpen ? uncontrolledInputValue : (selectedItem?.label ?? ""));

  const query = inputValue.trim().toLowerCase();
  let filteredItems = items;

  if (filter) {
    filteredItems = items.filter((item) => filter(item, inputValue));
  } else if (filter !== null && query) {
    filteredItems = items.filter((item) => isOptionMatch(item, query));
  }

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen === isOpen) {
        return;
      }

      if (openProp === undefined) {
        setUncontrolledOpen(nextOpen);
      }

      if (nextOpen && !isOpen && inputValueProp === undefined) {
        setUncontrolledInputValue("");
      }

      onOpenChange?.(nextOpen);
    },
    [inputValueProp, isOpen, onOpenChange, openProp],
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

  const context = React.useMemo<ComboboxInputContextValue>(
    () => ({
      clearValue: () => {
        setInputValue("");
        onValueChange?.("", null);
      },
      commitInputValue: onInputCommit,
      inputValue,
      setInputValue,
    }),
    [inputValue, onInputCommit, onValueChange, setInputValue],
  );

  return (
    <ComboboxInputContext.Provider value={context}>
      <Picker
        {...props}
        autoHighlight={autoHighlight}
        items={filteredItems}
        isItemEqualToValue={(item, currentValue) =>
          item.value === currentValue.value
        }
        open={isOpen}
        value={selectedItem}
        onOpenChange={setOpen}
        onValueChange={(item) => {
          if (!item) {
            onValueChange?.("", null);
            return;
          }

          setInputValue(item.label);
          onValueChange?.(item.value, item);
        }}
      >
        {children}
      </Picker>
    </ComboboxInputContext.Provider>
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
        "group/input-group border-input has-disabled:bg-input/50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 relative flex h-8 w-full min-w-0 items-center rounded-lg border transition-colors outline-none in-data-[slot=picker-content]:focus-within:border-inherit in-data-[slot=picker-content]:focus-within:ring-0 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
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
        "text-muted-foreground order-last flex h-auto cursor-text items-center justify-center gap-2 py-1.5 pr-2 text-sm font-medium select-none group-data-[disabled=true]/input-group:opacity-50 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem] [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
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

// Autofill and password managers write into an input they never focus, so no
// blur follows to commit the text; the change event is the only signal.
function isAutofillChange(input: HTMLInputElement) {
  for (const selector of [":autofill", ":-webkit-autofill"]) {
    try {
      if (input.matches(selector)) {
        return true;
      }
    } catch {
      // The browser does not support this selector.
    }
  }

  return document.activeElement !== input;
}

function ComboboxInput({
  className,
  children,
  autoComplete = "off",
  disabled = false,
  inputClassName,
  showChevron = true,
  showClear = false,
  onBlur,
  onChange,
  onFocus,
  onKeyDown,
  ref,
  ...props
}: ComboboxInputProps) {
  const combobox = useComboboxInputContext("ComboboxInput");
  const picker = usePickerContext("ComboboxInput");
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRef = React.useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input;

      if (typeof ref === "function") {
        ref(input);
      } else if (ref) {
        ref.current = input;
      }
    },
    [ref],
  );

  return (
    <ComboboxInputShell className={cn("w-auto", className)}>
      <ComboboxInputControl
        {...props}
        aria-activedescendant={
          picker.highlightedIndex >= 0
            ? picker.optionId(picker.highlightedIndex)
            : undefined
        }
        aria-autocomplete="list"
        aria-expanded={picker.isOpen}
        aria-controls={picker.pickerListId}
        autoComplete={autoComplete}
        className={inputClassName}
        disabled={disabled}
        onChange={(event) => {
          const nextInputValue = event.currentTarget.value;

          combobox.setInputValue(nextInputValue);

          if (
            combobox.commitInputValue &&
            isAutofillChange(event.currentTarget)
          ) {
            combobox.commitInputValue(nextInputValue);
            picker.setOpen(false);
          } else {
            picker.setOpen(true);
          }

          onChange?.(event);
        }}
        onBlur={onBlur}
        onFocus={(event) => {
          picker.setOpen(true);
          onFocus?.(event);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (event.defaultPrevented) {
            return;
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            picker.setOpen(true);
            picker.moveHighlight(1, 0);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            picker.setOpen(true);
            picker.moveHighlight(-1, picker.items.length - 1);
          } else if (event.key === "Enter") {
            if (
              picker.isOpen &&
              picker.highlightedIndex >= 0 &&
              picker.items[picker.highlightedIndex]
            ) {
              event.preventDefault();
              picker.selectItem(picker.items[picker.highlightedIndex]);
            }
          } else if (event.key === "Escape") {
            event.preventDefault();
            picker.setOpen(false);
          }
        }}
        ref={setRef}
        role="combobox"
        value={combobox.inputValue}
      />
      <ComboboxInputActions>
        {showClear && combobox.inputValue ? (
          <Button
            aria-label="Clear"
            size="icon-xs"
            variant="ghost"
            data-slot="combobox-clear"
            className="shadow-none"
            disabled={disabled}
            type="button"
            onClick={() => {
              combobox.clearValue();
              picker.setHighlightedIndex(-1);
              inputRef.current?.focus();
            }}
          >
            <XIcon className="pointer-events-none" />
          </Button>
        ) : null}
        {showChevron && (
          <ChevronDownIcon
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none size-4"
          />
        )}
      </ComboboxInputActions>
      {children}
    </ComboboxInputShell>
  );
}

export type ComboboxOption = SelectOption & {
  disabled?: boolean;
};

type ComboboxProps<TOption extends ComboboxOption> = {
  className?: string;
  commitOnBlur?: boolean;
  emptyMessage?: React.ReactNode;
  filter?: ((item: TOption, inputValue: string) => boolean) | null;
  inputValue?: string;
  inputProps?: React.ComponentProps<typeof ComboboxInput>;
  onInputValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  options: readonly TOption[];
  open?: boolean;
  renderOption?: (option: TOption) => React.ReactNode;
  value?: string;
  onValueChange?: (value: string, option: TOption | null) => void;
};

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function findTypedOption<TOption extends ComboboxOption>(
  inputValue: string,
  options: readonly TOption[],
) {
  const searchValue = normalizeSearchValue(inputValue);

  if (!searchValue) {
    return null;
  }

  const enabledOptions = options.filter((option) => !option.disabled);
  const exactMatch = enabledOptions.find(
    (option) =>
      normalizeSearchValue(option.label) === searchValue ||
      normalizeSearchValue(option.value) === searchValue,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const possibleMatches = enabledOptions.filter((option) =>
    isOptionMatch(option, searchValue),
  );

  return possibleMatches.length === 1 ? possibleMatches[0] : null;
}

function Combobox<TOption extends ComboboxOption>({
  className,
  commitOnBlur = true,
  emptyMessage = "No matches found.",
  filter,
  inputValue,
  inputProps,
  onInputValueChange,
  onOpenChange,
  options,
  open,
  renderOption = (option) => option.label,
  value = "",
  onValueChange,
}: ComboboxProps<TOption>) {
  const latestInputValue = React.useRef<string | null>(null);
  const { onBlur, onKeyDown, ...restInputProps } = inputProps ?? {};

  function commitTypedValue(inputValue: string) {
    if (!normalizeSearchValue(inputValue)) {
      onValueChange?.("", null);
      return;
    }

    const option = findTypedOption(inputValue, options);

    if (option) {
      onValueChange?.(option.value, option);
    }
  }

  return (
    <ComboboxRoot
      className={className}
      filter={filter}
      inputValue={inputValue}
      items={options}
      open={open}
      value={value}
      onInputCommit={(inputValue) => {
        latestInputValue.current = null;
        commitTypedValue(inputValue);
      }}
      onInputValueChange={(inputValue) => {
        latestInputValue.current = inputValue;
        onInputValueChange?.(inputValue);
      }}
      onOpenChange={onOpenChange}
      onValueChange={(nextValue, option) => {
        latestInputValue.current = null;
        onValueChange?.(nextValue, option);
      }}
    >
      <ComboboxInput
        {...restInputProps}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (event.key === "Escape" && !event.defaultPrevented) {
            latestInputValue.current = null;
          }
        }}
        onBlur={(event) => {
          if (commitOnBlur && latestInputValue.current !== null) {
            commitTypedValue(latestInputValue.current);
          }

          latestInputValue.current = null;
          onBlur?.(event);
        }}
      />
      <PickerContent>
        <PickerEmpty>{emptyMessage}</PickerEmpty>
        <PickerList<TOption>>
          {(option) => (
            <PickerItem key={option.value || option.label} value={option}>
              {renderOption(option)}
            </PickerItem>
          )}
        </PickerList>
      </PickerContent>
    </ComboboxRoot>
  );
}

export {
  Combobox,
  ComboboxRoot,
  ComboboxInput,
  PickerContent as ComboboxContent,
  PickerList as ComboboxList,
  PickerItem as ComboboxItem,
  PickerEmpty as ComboboxEmpty,
};

export default Combobox;
