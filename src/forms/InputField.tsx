"use client";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/components/ui/input";
import { FormControl } from "@kenstack/components/ui/form";
import {
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from "react-hook-form";

type InputProps = FieldProps &
  Omit<React.ComponentProps<"input">, "onChange" | "onBlur"> & {
    inputClass?: string;
    onChange?: ({
      event,
      field,
    }: {
      event: React.ChangeEvent<HTMLInputElement>;
      field: ControllerRenderProps<FieldValues, Path<FieldValues>>;
    }) => void;
    onBlur?: ({
      event,
      field,
    }: {
      event: React.FocusEvent<HTMLInputElement>;
      field: ControllerRenderProps<FieldValues, Path<FieldValues>>;
    }) => void;
  };

export default function InputField({
  name,
  label,
  description,
  className,
  inputClass,
  type = "text",
  onChange,
  onBlur,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <FormControl>
          <Input
            {...props}
            className={inputClass}
            {...field}
            type={type}
            onChange={(evt) => {
              if (onChange) {
                onChange({ event: evt, field });
              } else if (type === "email") {
                field.onChange(evt.target.value.toLowerCase().trim());
              } else {
                field.onChange(evt.target.value);
              }
            }}
            onBlur={
              onBlur
                ? (event) => {
                    onBlur({ event, field });
                    field.onBlur();
                  }
                : field.onBlur
            }
          />
        </FormControl>
      )}
    />
  );
}
