"use client";

import { useState } from "react";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";

import { Button } from "@kenstack/components/Button";
import { Eye, EyeOff } from "lucide-react";
import { twMerge } from "tailwind-merge";

type InputProps = FieldProps &
  React.ComponentProps<"input"> & {
    inputClass?: string;
  };

export default function InputField({
  name,
  label,
  description,
  className,
  inputClass,
  ...props
}: InputProps) {
  const [type, setType] = useState("password");
  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="flex-cl flex items-center">
          <Input
            {...props}
            className={twMerge(inputClass, "-mr-9 pr-10")}
            {...field}
            onChange={(evt) => {
              field.onChange(evt.target.value.trim());
            }}
            type={type}
          />
          <Button
            tabIndex={-1}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setType(type === "text" ? "password" : "text")}
          >
            {type === "password" ? (
              <Eye className="text-muted-foreground size-6" />
            ) : (
              <EyeOff className="text-muted-foreground size-6" />
            )}
          </Button>
        </div>
      )}
    />
  );
}
