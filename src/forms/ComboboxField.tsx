"use client";

import { useRef, type ComponentProps } from "react";
import type { ControllerRenderProps, FieldValues, Path } from "react-hook-form";
import { twMerge } from "tailwind-merge";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@kenstack/forms/controls/Combobox";
import Field, { type FieldProps } from "@kenstack/forms/Field";

type ComboboxFieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ComboboxFieldProps = FieldProps &
  Omit<ComponentProps<"div">, "onChange"> & {
    disabled?: boolean;
    emptyMessage?: string;
    inputClass?: string;
    options: ComboboxFieldOption[];
    placeholder?: string;
    showClear?: boolean;
    onChange?: (value: string, option: ComboboxFieldOption | null) => void;
  };

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function findTypedOption(inputValue: string, options: ComboboxFieldOption[]) {
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

  const possibleMatches = enabledOptions.filter(
    (option) =>
      normalizeSearchValue(option.label).includes(searchValue) ||
      normalizeSearchValue(option.value).includes(searchValue),
  );

  return possibleMatches.length === 1 ? possibleMatches[0] : null;
}

function ComboboxFieldControl({
  disabled,
  emptyMessage,
  field,
  inputClass,
  options,
  placeholder,
  showClear,
  onChange,
}: {
  disabled: boolean;
  emptyMessage: string;
  field: ControllerRenderProps<FieldValues, Path<FieldValues>>;
  inputClass?: string;
  options: ComboboxFieldOption[];
  placeholder: string;
  showClear: boolean;
  onChange?: (value: string, option: ComboboxFieldOption | null) => void;
}) {
  const latestInputValue = useRef<string | null>(null);
  const value = typeof field.value === "string" ? field.value : "";
  const selected =
    options.find((option) => option.value === value) ??
    (value ? { value, label: value } : null);

  function commitOption(option: ComboboxFieldOption | null) {
    const nextValue = option?.value ?? "";

    if (nextValue === value) {
      return;
    }

    field.onChange(nextValue);
    onChange?.(nextValue, option);
    latestInputValue.current = option?.label ?? "";
  }

  function commitTypedValue(inputValue: string) {
    if (!normalizeSearchValue(inputValue)) {
      commitOption(null);
      return;
    }

    const option = findTypedOption(inputValue, options);

    if (option) {
      commitOption(option);
    }
  }

  return (
    <Combobox<ComboboxFieldOption>
      items={options}
      value={selected}
      autoHighlight
      itemToStringLabel={(option) => option.label}
      isItemEqualToValue={(item, currentValue) =>
        item.value === currentValue.value
      }
      onValueChange={(option) => {
        commitOption(option);
      }}
      onInputValueChange={(nextInputValue) => {
        latestInputValue.current = nextInputValue;
      }}
    >
      <ComboboxInput
        disabled={disabled}
        placeholder={placeholder}
        showClear={showClear}
        className={twMerge("w-full", inputClass)}
        onBlur={(event) => {
          commitTypedValue(
            latestInputValue.current ?? event.currentTarget.value,
          );
          latestInputValue.current = null;
          field.onBlur();
        }}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(option: ComboboxFieldOption) => (
            <ComboboxItem
              key={option.value}
              value={option}
              disabled={option.disabled}
            >
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
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
