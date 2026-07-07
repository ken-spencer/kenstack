"use client";

import type React from "react";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { DateInput } from "@kenstack/forms/controls/DateInput";

type InputProps = FieldProps &
  Omit<React.ComponentProps<"input">, "name" | "onBlur" | "onChange" | "type"> & {
    inputClass?: string;
  };

export default function DateField({
  name,
  label,
  help,
  description,
  className,
  inputClass,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => (
        <FormControl>
          <DateInput
            {...props}
            name={field.name}
            ref={field.ref}
            className={inputClass}
            value={field.value}
            onValueCommit={field.onBlur}
            onValueChange={field.onChange}
          />
        </FormControl>
      )}
    />
  );
}
