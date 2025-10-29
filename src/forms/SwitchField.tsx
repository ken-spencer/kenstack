"use client";

// import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { FormControl } from "@kenstack/components/ui/form";
import { Switch } from "@kenstack/components/ui/switch";

type SwitchFieldProps = FieldProps & {
  className?: string;
  inputClass?: string;
};

export default function SwitchField({
  name,
  label,
  description,
  className,
}: SwitchFieldProps) {
  return (
    <Field
      name={name}
      // label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <label className="gap-3 text-lg select-text">{label}</label>
        </div>
      )}
    />
  );
}
