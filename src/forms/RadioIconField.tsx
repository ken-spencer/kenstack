import { twMerge } from "tailwind-merge";

// import { HandHelping, HandCoins } from "lucide-react";

import Field, { type FieldProps } from "@kenstack/forms/Field";

import type { IconOptions } from "./types";
type RadioIconFieldProps = FieldProps & {
  className?: string;
  grid?: string;
  options: IconOptions;
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
          // className="flex flex-col gap-4"
          className={twMerge("grid gap-4 md:grid-cols-2", grid)}
          tabIndex={-1}
          // onBlur={(evt) => {
          //   field.onBlur(evt);
          // }}
        >
          {options.map(([key, label, { icon: Icon, description }]) => (
            <label
              className={twMerge(
                "flex cursor-pointer items-center gap-4 p-2",
                "rounded border border-purple-500",
                key === field.value
                  ? "bg-purple-300"
                  : "transition hover:bg-purple-200"
              )}
              key={key}
            >
              <input
                {...field}
                className="hidden"
                type="radio"
                value={key}
                checked={key === field.value}
                onBlur={undefined} // disable commit onBlur
                // onChange={(evt) => {
                //   field.onChange(evt);
                //   commit();
                // }}
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
