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

export type SelectOption = {
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  keywords?: readonly string[];
  label: string;
  value: string;
};

type SelectProps = Omit<
  React.ComponentPropsWithRef<"button">,
  "children" | "onChange" | "value"
> & {
  contentClassName?: string;
  itemClassName?: string;
  listLabel?: string;
  options: readonly SelectOption[];
  placeholder?: string;
  rootClassName?: string;
  value?: string;
  onValueChange?: (value: string, option: SelectOption) => void;
};

function Select({
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
}: SelectProps) {
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
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-3 text-left text-sm shadow-sm transition outline-none hover:border-gray-400 focus-visible:border-fuchsia-800 focus-visible:ring-2 focus-visible:ring-fuchsia-800/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:opacity-70",
          className,
        )}
        disabled={disabled}
        onBlur={onBlur}
      >
        {SelectedIcon
          ? React.createElement(SelectedIcon, {
              className: "size-4 shrink-0 text-gray-500",
            })
          : null}
        <span
          className={twMerge(
            "min-w-0 truncate",
            !selectedOption && "text-gray-500",
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-gray-500 transition" />
      </PickerTrigger>
      <PickerContent
        className={twMerge(
          "rounded-md border border-gray-200 bg-white p-0 shadow-lg ring-0",
          contentClassName,
        )}
      >
        <PickerList aria-label={listLabel}>
          {options.map((option) => (
            <PickerItem
              checkPosition="left"
              className={twMerge(
                "aria-selected:bg-fuchsia-50 aria-selected:text-fuchsia-950",
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
                  <span className="mt-0.5 block text-xs text-gray-500">
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
