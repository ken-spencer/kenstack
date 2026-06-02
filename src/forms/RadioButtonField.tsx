"use client";

import type { ComponentType, SVGProps } from "react";
import { twMerge } from "tailwind-merge";

import Field, { type FieldProps } from "@kenstack/forms/Field";

type RadioButtonOption = {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
};

type RadioButtonFieldProps = FieldProps & {
  buttonClassName?: string;
  className?: string;
  disabled?: boolean;
  groupClassName?: string;
  options: readonly RadioButtonOption[];
  onValueChange?: (value: string, option: RadioButtonOption) => void;
};

export default function RadioButtonField({
  buttonClassName,
  className,
  disabled,
  groupClassName,
  label,
  name,
  options,
  help,
  description,
  onValueChange,
}: RadioButtonFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => (
        <div className={twMerge("flex flex-wrap gap-1.5", groupClassName)}>
          {options.map(({ icon: Icon, label, value }, index) => (
            <label
              key={value}
              className={twMerge(
                "cursor-pointer text-xs",
                disabled && "cursor-not-allowed",
              )}
            >
              <input
                ref={index === 0 ? field.ref : undefined}
                type="radio"
                name={field.name}
                value={value}
                checked={
                  typeof field.value === "string" && field.value === value
                }
                className="peer sr-only"
                disabled={disabled}
                onBlur={field.onBlur}
                onChange={() => {
                  if (disabled) {
                    return;
                  }

                  field.onChange(value);
                  onValueChange?.(value, { icon: Icon, label, value });
                }}
              />
              <span
                className={twMerge(
                  "flex min-h-9 min-w-28 items-center justify-center gap-1 rounded border border-gray-200 px-2 text-center transition peer-checked:border-fuchsia-800 peer-checked:bg-fuchsia-800/85 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-fuchsia-800 peer-focus-visible:ring-offset-2",
                  disabled
                    ? "opacity-60"
                    : "hover:bg-gray-50 peer-checked:hover:bg-fuchsia-800",
                  buttonClassName,
                )}
              >
                {Icon ? <Icon className="size-3.5" /> : null}
                {label}
              </span>
            </label>
          ))}
        </div>
      )}
    />
  );
}
