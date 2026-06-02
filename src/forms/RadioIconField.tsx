import type { ComponentType, SVGProps } from "react";
import { twMerge } from "tailwind-merge";

import Field, { type FieldProps } from "@kenstack/forms/Field";

type RadioIconOption = {
  description?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
};

type RadioIconFieldProps = FieldProps & {
  className?: string;
  grid?: string;
  options: readonly RadioIconOption[];
};

export default function RadioIconField({
  name,
  label,
  description,
  className,
  options = [],
  grid,
}: RadioIconFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div
          className={twMerge("grid gap-4 md:grid-cols-2", grid)}
          tabIndex={-1}
        >
          {options.map(({ description, icon: Icon, label, value }) => (
            <label
              className={twMerge(
                "flex cursor-pointer items-center gap-4 p-2",
                "rounded border border-purple-500",
                value === field.value
                  ? "bg-purple-300"
                  : "transition hover:bg-purple-200",
              )}
              key={value}
            >
              <input
                {...field}
                className="hidden"
                type="radio"
                value={value}
                checked={value === field.value}
                onBlur={undefined}
              />

              <span className="rounded-full border bg-purple-800 p-2">
                <Icon className="h-8 w-8 text-white" />
              </span>
              <div>
                <span className="text-xl">{label}</span>
                <p>{description}</p>
              </div>
            </label>
          ))}
        </div>
      )}
    />
  );
}
