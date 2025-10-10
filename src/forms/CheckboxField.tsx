"use client";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";

// import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Checkbox } from "@kenstack/components/ui/checkbox";
// import { FormLabel } from "@kenstack/components/ui/form";

type InputProps = FieldProps &
  React.ComponentProps<typeof CheckboxPrimitive.Root> & {
    inputClass?: string;
  };

export default function CheckboxField({
  name,
  label,
  description,
  className,
  inputClass,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      // label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <label className="flex items-center gap-3 text-lg select-text">
          <Checkbox
            {...props}
            className={inputClass}
            {...field}
            onClick={(evt) => {
              field.onChange(!field.value);
            }}
            checked={field.value}
          />
          {label}
        </label>
      )}
    />
  );
}
