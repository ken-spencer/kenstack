"use client";

import { type ComponentProps } from "react";

import { Select, type SelectOption } from "@kenstack/forms/controls/Select";
import Field, { type FieldProps } from "@kenstack/forms/Field";

type SelectFieldProps = FieldProps &
  ComponentProps<"div"> & {
    buttonClassName?: string;
    disabled?: boolean;
    options: readonly SelectOption[];
    placeholder?: string;
    onValueChange?: (value: string, option: SelectOption) => void;
  };

export default function SelectField({
  buttonClassName,
  className,
  disabled = false,
  label,
  name,
  options,
  placeholder = "Select...",
  help,
  description,
  onValueChange,
  ...props
}: SelectFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      {...props}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";

        return (
          <Select
            ref={field.ref}
            className={buttonClassName}
            disabled={disabled}
            listLabel={typeof label === "string" ? label : undefined}
            options={options}
            placeholder={placeholder}
            value={value}
            onBlur={field.onBlur}
            onValueChange={(nextValue, option) => {
              field.onChange(nextValue);
              onValueChange?.(nextValue, option);
            }}
          />
        );
      }}
    />
  );
}
