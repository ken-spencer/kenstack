"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Clock } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { Button } from "@kenstack/components/Button";
import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";

type InputProps = FieldProps &
  Omit<React.ComponentProps<"input">, "name" | "onBlur" | "onChange" | "type"> & {
    inputClass?: string;
  };

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}

function parseTimeValue(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim().toLowerCase().replace(/\s+/g, " ");
  if (!trimmed) {
    return "";
  }

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed === "noon") {
    return "12:00";
  }

  if (trimmed === "midnight") {
    return "00:00";
  }

  const match = trimmed.match(/^(\d{1,2})(?::?([0-5]\d))?\s*([ap])?\.?m?\.?$/);
  if (!match) {
    return "";
  }

  const period = match[3];
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;

  if (period) {
    if (hours < 1 || hours > 12) {
      return "";
    }

    if (period === "a") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  } else if (hours > 23) {
    return "";
  }

  return `${padTimePart(hours)}:${padTimePart(minutes)}`;
}

function formatTime(value: unknown) {
  const timeValue = parseTimeValue(value);
  if (!timeValue) {
    return typeof value === "string" ? value : "";
  }

  const [hours, minutes] = timeValue.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${padTimePart(minutes)} ${period}`;
}

export default function TimeField({
  name,
  label,
  help,
  description,
  className,
  inputClass,
  disabled,
  ...props
}: InputProps) {
  const { watch, getValues } = useFormContext();
  const [prevFormValue, setPrevFormValue] = useState(getValues(name));
  const [value, setValue] = useState(() => formatTime(getValues(name)));

  const formValue = watch(name);
  if (formValue !== prevFormValue) {
    setPrevFormValue(formValue);
    setValue(formatTime(formValue));
  }

  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => {
        const handleTime = (newValue: string) => {
          const timeValue = parseTimeValue(newValue);
          field.onChange(timeValue || newValue);
          field.onBlur();
          setValue(timeValue ? formatTime(timeValue) : newValue);
        };

        return (
          <div className="relative flex items-center">
            <Button
              aria-hidden="true"
              disabled={disabled}
              tabIndex={-1}
              type="button"
              variant="ghost"
              size="icon"
              className="absolute pointer-events-none"
            >
              <Clock />
            </Button>
            <FormControl>
              <Input
                {...field}
                {...props}
                disabled={disabled}
                type="text"
                inputMode="text"
                className={twMerge(inputClass, "pl-11")}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleTime(value);
                  }
                }}
                onBlur={() => {
                  handleTime(value);
                }}
              />
            </FormControl>
          </div>
        );
      }}
    />
  );
}
