"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { twMerge } from "tailwind-merge";

import { Button } from "@kenstack/components/Button";
import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";

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
          <FormControl>
            <Input
              {...props}
              className={twMerge(inputClass, "-mr-9 pr-10")}
              {...field}
              onChange={(evt) => {
                field.onChange(evt.target.value.trim());
              }}
              type={type}
            />
          </FormControl>
          <Button
            aria-label={type === "password" ? "Show password" : "Hide password"}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setType((current) => (current === "text" ? "password" : "text"))
            }
          >
            {type === "password" ? (
              <Eye aria-hidden className="text-muted-foreground size-6" />
            ) : (
              <EyeOff aria-hidden className="text-muted-foreground size-6" />
            )}
          </Button>
        </div>
      )}
    />
  );
}
