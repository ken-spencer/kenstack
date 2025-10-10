// import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Textarea } from "@kenstack/components/ui/textarea";

import { FormControl } from "@kenstack/components/ui/form";

type InputProps = FieldProps &
  React.ComponentProps<"textarea"> & {
    inputClass?: string;
    maxLength?: number;
  };

export default function TextareaField({
  name,
  label,
  description,
  inputClass,
  maxLength,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={({ field }) => (
        <div>
          <FormControl>
            <Textarea
              {...props}
              {...field}
              className={inputClass}
              maxLength={maxLength}
            />
          </FormControl>
          {maxLength && (
            <div className="text-xs">
              {field.value?.length ?? 0} of {maxLength.toLocaleString()}
            </div>
          )}
        </div>
      )}
    />
  );
}
