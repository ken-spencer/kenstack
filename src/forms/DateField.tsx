"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { parse } from "chrono-node";
import { twMerge } from "tailwind-merge";
import { Calendar as CalendarIcon } from "lucide-react";

import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/components/ui/input";
import { FormControl } from "@kenstack/components/ui/form";
import { Button } from "@kenstack/components/ui/button";
import { Calendar } from "@kenstack/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/ui/popover";

type InputProps = FieldProps &
  React.ComponentProps<"input"> & {
    inputClass?: string;
  };

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function toDateValue(date: Date) {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

function toDateObject(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    return toDateValue(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (datePattern.test(trimmed)) {
    return trimmed;
  }

  const result = parse(trimmed)[0];
  if (!result) {
    return "";
  }

  const year = result.start.get("year");
  const month = result.start.get("month");
  const day = result.start.get("day");

  if (year === null || month === null || day === null) {
    return "";
  }

  return [year, padDatePart(month), padDatePart(day)].join("-");
}

function formatDate(value: string) {
  return value ? format(toDateObject(value), "MMMM d, yyyy") : "";
}

function normalizeFormValue(value: unknown) {
  if (value instanceof Date) {
    return toDateValue(value);
  }

  if (typeof value !== "string" || !value) {
    return "";
  }

  return datePattern.test(value) ? value : value.slice(0, 10);
}

export default function DateField({
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
  const [value, setValue] = useState(() =>
    formatDate(normalizeFormValue(getValues(name))),
  );

  const formValue = watch(name);
  if (formValue !== prevFormValue) {
    setPrevFormValue(formValue);
    setValue(formatDate(normalizeFormValue(formValue)));
  }

  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => {
        const handleDate = (newDate: string | Date) => {
          const result = newDate ? parseDateValue(newDate) : "";
          field.onChange(result);
          field.onBlur();
          setValue(formatDate(result));
        };

        return (
          <div className="relative flex items-center">
            <DatePicker
              disabled={disabled}
              handleDate={handleDate}
              value={normalizeFormValue(field.value)}
            />
            <FormControl>
              <Input
                {...field}
                placeholder="eg: January 27, 1932"
                {...props}
                disabled={disabled}
                className={twMerge("pl-9", inputClass)}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleDate(value);
                  }
                }}
                onBlur={() => {
                  handleDate(value);
                }}
              />
            </FormControl>
          </div>
        );
      }}
    />
  );
}

function DatePicker({
  disabled,
  handleDate,
  value,
}: {
  disabled?: boolean;
  handleDate: (newDate: string | Date) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const date = useMemo(
    () => (value ? toDateObject(value) : undefined),
    [value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          variant="ghost"
          size="icon"
          className="absolute"
        >
          <CalendarIcon />
          <span className="sr-only">Pick a date</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            handleDate(selectedDate ?? "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
