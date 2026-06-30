"use client";

import { Globe } from "lucide-react";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";
import { cn } from "@kenstack/lib/utils";

type InputProps = FieldProps &
  React.ComponentProps<"input"> & {
    inputClass?: string;
    icon?: React.ReactNode;
  };

export default function UrlField({
  name,
  label,
  description,
  className,
  inputClass,
  icon = <Globe className="text-gray-800" />,
  ...props
}: InputProps) {
  const hasIcon = icon != null && icon !== false;

  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="relative">
          {hasIcon ? (
            <span
              className={cn(
                "absolute top-1/2 left-2 z-10 flex size-5 -translate-y-1/2 items-center justify-center",
              )}
            >
              {icon}
            </span>
          ) : null}
          <FormControl>
            <Input
              {...props}
              {...field}
              className={cn(hasIcon && "pl-9", inputClass)}
              type="url"
            />
          </FormControl>
        </div>
      )}
    />
  );
}
