"use client";

import type { ComponentType, SVGProps } from "react";

import GroupField from "@kenstack/forms/GroupField";
import type { FieldProps } from "@kenstack/forms/Field";
import { ToggleGroup } from "@kenstack/forms/controls/ToggleGroup";
import { cn } from "@kenstack/lib/utils";

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
    <GroupField
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => (
        <ToggleGroup
          className={cn("mt-2", groupClassName)}
          disabled={disabled}
          itemClassName={buttonClassName}
          name={field.name}
          options={options}
          value={typeof field.value === "string" ? field.value : ""}
          onBlur={field.onBlur}
          onValueChange={(value, option) => {
            field.onChange(value);
            onValueChange?.(value, option);
          }}
        />
      )}
    />
  );
}
