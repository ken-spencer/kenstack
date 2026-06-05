import type { ComponentType, SVGProps } from "react";
import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";

type CheckboxIconOption = {
  description?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
};

type CheckboxIconFieldProps = FieldProps & {
  grid?: string;
  options: readonly CheckboxIconOption[];
};

export default function CheckboxIconField({
  name,
  label,
  description,
  grid = "",
  options = [],
}: CheckboxIconFieldProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={({ field }) => (
        <div className={twMerge("grid grid-cols-2 gap-4", grid)} tabIndex={-1}>
          {options.map(({ description, icon: Icon, label, value }) => (
            <label
              className={twMerge(
                "flex cursor-pointer items-center gap-4 rounded border p-2",
              )}
              key={value}
            >
              <input
                {...field}
                className="hidden"
                type="checkbox"
                value={value}
                checked={field.value.includes(value)}
                onBlur={undefined}
                onChange={(evt) => {
                  const next = evt.target.checked
                    ? [...field.value, value]
                    : field.value.filter((item: string) => item !== value);
                  field.onChange(next);
                }}
              />

              <span
                className={twMerge(
                  "rounded-full border border-purple-800 p-2 transition",
                  field.value.includes(value) ? "bg-purple-800 text-white" : "",
                )}
              >
                <Icon className="h-8 w-8" />
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
