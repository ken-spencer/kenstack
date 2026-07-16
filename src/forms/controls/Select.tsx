"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { twMerge } from "tailwind-merge";

import {
  Picker,
  PickerContent,
  PickerItem,
  PickerList,
  PickerTrigger,
} from "@kenstack/forms/controls/Picker";

export type SelectOption<TValue extends string = string> = {
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  keywords?: readonly string[];
  label: string;
  value: TValue;
};

type SelectProps<TOption extends SelectOption = SelectOption> = Omit<
  React.ComponentPropsWithRef<"button">,
  "children" | "onChange" | "value"
> & {
  contentClassName?: string;
  itemClassName?: string;
  listLabel?: string;
  options: readonly TOption[];
  placeholder?: string;
  rootClassName?: string;
  value?: string;
  onValueChange?: (value: TOption["value"], option: TOption) => void;
};

function Select<TOption extends SelectOption = SelectOption>({
  className,
  contentClassName,
  disabled = false,
  itemClassName,
  listLabel,
  options,
  placeholder = "Select...",
  ref,
  rootClassName,
  value = "",
  onBlur,
  onValueChange,
  ...props
}: SelectProps<TOption>) {
  const selectedOption =
    options.find((option) => option.value === value) ?? null;
  const SelectedIcon = selectedOption?.icon;

  return (
    <Picker
      className={rootClassName}
      items={options}
      value={selectedOption}
      onValueChange={(option) => {
        if (!option) {
          return;
        }

        onValueChange?.(option.value, option);
      }}
    >
      <PickerTrigger
        {...props}
        ref={ref}
        className={twMerge(
          "border-input bg-background hover:border-ring disabled:bg-muted disabled:text-muted-foreground flex h-10 w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-sm shadow-sm transition outline-none focus-visible:border-fuchsia-800 focus-visible:ring-2 focus-visible:ring-fuchsia-800/30 disabled:cursor-not-allowed disabled:opacity-70",
          className,
        )}
        disabled={disabled}
        onBlur={onBlur}
      >
        {SelectedIcon
          ? React.createElement(SelectedIcon, {
              className: "text-muted-foreground size-4 shrink-0",
            })
          : null}
        <span
          className={twMerge(
            "min-w-0 truncate",
            !selectedOption && "text-muted-foreground",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="text-muted-foreground size-4 shrink-0 transition" />
      </PickerTrigger>
      <PickerContent
        className={twMerge(
          "border-border bg-popover text-popover-foreground rounded-md border p-0 shadow-lg ring-0",
          contentClassName,
        )}
      >
        <PickerList aria-label={listLabel}>
          {options.map((option) => (
            <PickerItem
              checkPosition="left"
              className={twMerge(
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
                itemClassName,
              )}
              key={option.value || option.label}
              value={option}
            >
              {option.icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {React.createElement(option.icon, { className: "size-4" })}
                </span>
              ) : null}
              <span className="min-w-0">
                <span className="block font-medium">{option.label}</span>
                {option.description ? (
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </PickerItem>
          ))}
        </PickerList>
      </PickerContent>
    </Picker>
  );
}

export { Select };
