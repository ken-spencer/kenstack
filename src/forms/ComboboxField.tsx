"use client";

import { useRef, type ComponentProps } from "react";
import {
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { twMerge } from "tailwind-merge";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@kenstack/forms/controls/Combobox";
import type { SelectOption } from "@kenstack/forms/controls/Select";
import Field, { type FieldProps } from "@kenstack/forms/Field";

type ComboboxFieldOption = SelectOption & {
  disabled?: boolean;
};

type ComboboxFieldProps = FieldProps &
  Omit<ComponentProps<"div">, "onChange"> & {
    disabled?: boolean;
    emptyMessage?: string;
    inputAutoComplete?: string;
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

  const possibleMatches = enabledOptions.filter((option) =>
    optionMatchesInput(option, searchValue),
  );

  return possibleMatches.length === 1 ? possibleMatches[0] : null;
}

function optionMatchesInput(
  option: ComboboxFieldOption,
  normalizedInputValue: string,
) {
  return [option.label, option.value, ...(option.keywords ?? [])].some(
    (value) => normalizeSearchValue(value).includes(normalizedInputValue),
  );
}

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
  options: ComboboxFieldOption[];
  placeholder: string;
  showClear: boolean;
  onChange?: (value: string, option: ComboboxFieldOption | null) => void;
}) {
  const { setValue } = useFormContext();
  const latestInputValue = useRef<string | null>(null);
  const value = typeof field.value === "string" ? field.value : "";
  const selected =
    options.find((option) => option.value === value) ??
    (value ? { value, label: value } : null);
  const comboboxOptions =
    selected && !options.some((option) => option.value === selected.value)
      ? [selected, ...options]
      : options;

  function commitOption(option: ComboboxFieldOption | null) {
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
      latestInputValue.current = null;
      return;
    }

    onChange?.(nextValue, option);
    latestInputValue.current = null;
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
    <Combobox
      items={comboboxOptions}
      value={value}
      autoHighlight
      onValueChange={(_nextValue, option) => {
        commitOption(option);
      }}
      onInputValueChange={(nextInputValue) => {
        latestInputValue.current = nextInputValue;
      }}
    >
      <ComboboxInput
        autoComplete={inputAutoComplete}
        disabled={disabled}
        placeholder={placeholder}
        showClear={showClear}
        className={twMerge("w-full", inputClass)}
        onBlur={() => {
          if (latestInputValue.current !== null) {
            commitTypedValue(latestInputValue.current);
          }

          latestInputValue.current = null;
          field.onBlur();
        }}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(option: ComboboxFieldOption) => (
            <ComboboxItem key={option.value} value={option}>
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
