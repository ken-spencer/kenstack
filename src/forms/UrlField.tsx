"use client";

import { Globe } from "lucide-react";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";

type InputProps = FieldProps &
  React.ComponentProps<typeof Input> & {
    inputClass?: string;
  };

export default function UrlField({
  name,
  label,
  help,
  description,
  className,
  endAdornment,
  inputClass,
  startAdornment = <Globe className="text-foreground size-5" />,
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
          <Input
            {...props}
            {...field}
            className={inputClass}
            endAdornment={endAdornment}
            startAdornment={startAdornment}
            type="url"
          />
        </FormControl>
      )}
    />
  );
}
