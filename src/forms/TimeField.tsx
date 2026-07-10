"use client";

import type React from "react";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { TimeInput } from "@kenstack/forms/controls/TimeInput";

type InputProps = FieldProps &
  Omit<
    React.ComponentProps<"input">,
    "name" | "onBlur" | "onChange" | "type"
  > & {
    inputClass?: string;
  };

export default function TimeField({
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
          <TimeInput
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
