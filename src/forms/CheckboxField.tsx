"use client";

import type { FieldCheckedValue } from "@kenstack/fields/field";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Checkbox } from "@kenstack/forms/controls/Checkbox";
import Help from "@kenstack/components/Help";

export type CheckedFieldProps = FieldProps & {
  checked?: FieldCheckedValue;
  inputClass?: string;
  unchecked?: FieldCheckedValue;
};

type InputProps = CheckedFieldProps &
  Omit<
    React.ComponentProps<typeof Checkbox>,
    "checked" | "defaultChecked" | "onCheckedChange"
  >;

export default function CheckboxField({
  checked = true,
  name,
  label,
  help,
  description,
  className,
  inputClass,
  unchecked = false,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      description={description}
      className={className}
      render={({ field }) => (
        <label className="flex items-center gap-3 text-lg select-text">
          <Checkbox
            {...props}
            className={inputClass}
            {...field}
            onCheckedChange={(isChecked) => {
              field.onChange(isChecked === true ? checked : unchecked);
              field.onBlur();
            }}
            checked={field.value === checked}
          />
          {label}
          {help ? <Help message={help} /> : null}
        </label>
      )}
    />
  );
}
