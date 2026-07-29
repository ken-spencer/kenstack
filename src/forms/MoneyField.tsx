"use client";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import MoneyInput from "@kenstack/forms/controls/MoneyInput";

type MoneyFieldProps = FieldProps &
  Omit<React.ComponentProps<typeof MoneyInput>, "onValueChange" | "value">;

// Connects the shared integer-cent input to a Kenstack form field.
export default function MoneyField({
  name,
  label,
  help,
  description,
  className,
  ...props
}: MoneyFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => (
        <FormControl>
          <MoneyInput
            {...props}
            name={field.name}
            ref={field.ref}
            value={typeof field.value === "number" ? field.value : null}
            onBlur={field.onBlur}
            onValueChange={field.onChange}
          />
        </FormControl>
      )}
    />
  );
}
