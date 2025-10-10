import { twMerge } from "tailwind-merge";
import Field, { FieldProps } from "@kenstack/forms/Field";

import type { IconOptions } from "./types";

type CheckboxIconFieldProps = FieldProps & {
  grid?: string;
  options: IconOptions;
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
        <div
          className={twMerge("grid grid-cols-2 gap-4", grid)}
          tabIndex={-1}
          // onBlur={(evt) => {
          //   field.onBlur(evt);
          // }}
        >
          {options.map(([key, label, { icon: Icon, description }]) => (
            <label
              className={twMerge(
                "flex cursor-pointer items-center gap-4 rounded border p-2"
              )}
              key={key}
            >
              <input
                {...field}
                className="hidden"
                type="checkbox"
                value={key}
                checked={field.value.includes(key)}
                onBlur={undefined} // save on change, not blur
                onChange={(evt) => {
                  const next = evt.target.checked
                    ? [...field.value, key]
                    : field.value.filter((v) => v !== key);
                  field.onChange(next);
                }}
              />

              <span
                className={twMerge(
                  "rounded-full border border-purple-800 p-2 transition",
                  field.value.includes(key) ? "bg-purple-800 text-white" : ""
                  // key === field.value
                  //   ? "bg-purple-300"
                  //   : "hover:bg-purple-200 transition",
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
