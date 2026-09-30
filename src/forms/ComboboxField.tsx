"use client";

import type { ComponentProps } from "react";
import { useFormContext } from "react-hook-form";
import { twMerge } from "tailwind-merge";

import Combobox, {
  type ComboboxOption,
} from "@kenstack/forms/controls/Combobox";
import Field, { type FieldProps } from "@kenstack/forms/Field";

type ComboboxFieldProps = FieldProps &
  Omit<ComponentProps<"div">, "onChange"> & {
    disabled?: boolean;
    emptyMessage?: string;
    inputAutoComplete?: string;
    inputClass?: string;
    options: readonly ComboboxOption[];
    placeholder?: string;
    showClear?: boolean;
    onChange?: (value: string, option: ComboboxOption | null) => void;
  };

export default function ComboboxField({
  name,
  label,
  help,
  description,
  className,
  disabled = false,
  emptyMessage = "No matches found.",
  inputAutoComplete,
  inputClass,
  options,
  placeholder = "Search...",
  showClear = true,
  onChange,
  ...props
}: ComboboxFieldProps) {
  const { setValue } = useFormContext();

  return (
    <Field
      {...props}
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const selected =
          options.find((option) => option.value === value) ??
          (value ? { value, label: value } : null);
        const comboboxOptions =
          selected && !options.some((option) => option.value === selected.value)
            ? [selected, ...options]
            : options;

        function commitOption(option: ComboboxOption | null) {
          const nextValue = option?.value ?? "";

          if (option) {
            setValue(field.name, nextValue, {
              shouldDirty: nextValue !== value,
              shouldTouch: true,
              shouldValidate: true,
            });
          } else if (nextValue !== value) {
            field.onChange(nextValue);
          } else {
            return;
          }

          onChange?.(nextValue, option);
        }

        return (
          <Combobox
            options={comboboxOptions}
            value={value}
            emptyMessage={emptyMessage}
            inputProps={{
              autoComplete: inputAutoComplete,
              className: twMerge("w-full", inputClass),
              disabled,
              placeholder,
              showClear,
              onBlur: field.onBlur,
            }}
            onValueChange={(_nextValue, option) => {
              commitOption(option);
            }}
          />
        );
      }}
    />
  );
}
