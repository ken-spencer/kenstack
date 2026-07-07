"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { parse } from "chrono-node";
import { twMerge } from "tailwind-merge";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import { Calendar } from "@kenstack/components/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/Popover";
import { Input } from "@kenstack/forms/controls/Input";

type DateInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "type" | "value"
> & {
  onValueCommit?: () => void;
  onValueChange?: (value: string) => void;
  value?: string | Date;
};

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

function isDateValue(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    toDateValue(toDateObject(value)) === value
  );
}

function parseDateValue(value: string | Date) {
  if (value instanceof Date) {
    return toDateValue(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (isDateValue(trimmed)) {
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

function normalizeValue(value: unknown) {
  if (value instanceof Date) {
    return toDateValue(value);
  }

  if (typeof value !== "string" || !value) {
    return "";
  }

  return isDateValue(value) ? value : "";
}

function formatValue(value: unknown) {
  if (value instanceof Date) {
    return formatDate(toDateValue(value));
  }

  if (typeof value !== "string" || !value) {
    return "";
  }

  return isDateValue(value) ? formatDate(value) : value;
}

export function DateInput({
  className,
  disabled,
  onBlur,
  onKeyDown,
  onValueCommit,
  onValueChange,
  value,
  ...props
}: DateInputProps) {
  const [prevValue, setPrevValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(() => formatValue(value));
  const dateValue = normalizeValue(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setDisplayValue(formatValue(value));
  }

  function commitDate(newDate: string | Date) {
    const result = newDate ? parseDateValue(newDate) : "";
    const nextValue =
      result || (typeof newDate === "string" && newDate.trim() ? newDate : "");

    onValueChange?.(nextValue);
    onValueCommit?.();
    setDisplayValue(result ? formatDate(result) : nextValue);
  }

  return (
    <div className="relative flex items-center">
      <DatePicker
        disabled={disabled}
        onValueChange={commitDate}
        value={dateValue}
      />
      <Input
        {...props}
        disabled={disabled}
        className={twMerge("pl-9", className)}
        placeholder={props.placeholder ?? "eg: January 27, 1932"}
        suppressHydrationWarning
        value={displayValue}
        onChange={(event) => {
          setDisplayValue(event.target.value);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (!event.defaultPrevented && event.key === "Enter") {
            event.preventDefault();
            commitDate(displayValue);
          }
        }}
        onBlur={(event) => {
          commitDate(displayValue);
          onBlur?.(event);
        }}
      />
    </div>
  );
}

function DatePicker({
  disabled,
  onValueChange,
  value,
}: {
  disabled?: boolean;
  onValueChange: (newDate: string | Date) => void;
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
          type="button"
          disabled={disabled}
          variant="ghost"
          size="icon"
          className="absolute"
        >
          <CalendarIcon aria-hidden="true" />
          <span className="sr-only">Pick a date</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onValueChange(selectedDate ?? "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
