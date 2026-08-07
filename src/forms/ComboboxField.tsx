"use client";

import type { ComponentProps } from "react";
import {
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";
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

function ComboboxFieldControl({
  disabled,
  emptyMessage,
  field,
  inputAutoComplete,
  inputClass,
  options,
  placeholder,
  showClear,
  onChange,
}: {
  disabled: boolean;
  emptyMessage: string;
  field: ControllerRenderProps<FieldValues, Path<FieldValues>>;
  inputAutoComplete?: string;
  inputClass?: string;
  options: readonly ComboboxOption[];
  placeholder: string;
  showClear: boolean;
  onChange?: (value: string, option: ComboboxOption | null) => void;
}) {
  const { setValue } = useFormContext();
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
}

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
  return (
    <Field
      {...props}
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => (
        <ComboboxFieldControl
          disabled={disabled}
          emptyMessage={emptyMessage}
          field={field}
          inputAutoComplete={inputAutoComplete}
          inputClass={inputClass}
          options={options}
          placeholder={placeholder}
          showClear={showClear}
          onChange={onChange}
        />
      )}
    />
  );
}
