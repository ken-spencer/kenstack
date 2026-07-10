"use client";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { X } from "lucide-react";
import type { ControllerRenderProps, FieldValues } from "react-hook-form";

import Search from "./Search";
import type { Tag } from "./types";

type InputProps = React.ComponentProps<"input"> & FieldProps;

export default function Tags({
  name,
  label,
  description,
  className,
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({
        field,
      }: {
        field: ControllerRenderProps<FieldValues, string>;
      }) => (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {field.value?.map((tag: Tag) => {
            return (
              <span key={tag.name} className="inline-flex items-center gap-2">
                {tag.name}
                <button
                  type="button"
                  onClick={() => {
                    const newValue = field.value.filter((v: Tag) => v !== tag);
                    field.onChange(newValue);
                  }}
                >
                  <X className="text-gray-800" />
                </button>
              </span>
            );
          })}
          <Search field={field} />
        </div>
      )}
    />
  );
}
