"use client";

// import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Checkbox } from "@kenstack/forms/controls/Checkbox";

type InputProps = FieldProps &
  React.ComponentProps<typeof Checkbox> & {
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
            onCheckedChange={(checked) => {
              field.onChange(checked === true);
            }}
            checked={field.value}
          />
          {label}
        </label>
      )}
    />
  );
}
