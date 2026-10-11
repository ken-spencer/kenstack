"use client";

import { useContext } from "react";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { FieldLockedContext } from "@kenstack/forms/fieldLocked";
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
      }) => <TagList field={field} />}
    />
  );
}

// Inside Field, so a lock on this field or on an outer one disables the remove buttons.
function TagList({
  field,
}: {
  field: ControllerRenderProps<FieldValues, string>;
}) {
  const locked = useContext(FieldLockedContext);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {field.value?.map((tag: Tag) => {
        return (
          <span key={tag.name} className="inline-flex items-center gap-2">
            {tag.name}
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                field.onChange(field.value.filter((v: Tag) => v !== tag));
              }}
            >
              <X className="text-foreground" />
            </button>
          </span>
        );
      })}
      <Search field={field} />
    </div>
  );
}
