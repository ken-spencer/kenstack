"use client";

import * as React from "react";
import { Clock } from "lucide-react";
import { twMerge } from "tailwind-merge";

import { Input } from "@kenstack/forms/controls/Input";

type TimeInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "type" | "value"
> & {
  onValueCommit?: () => void;
  onValueChange?: (value: string) => void;
  value?: string;
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

  const [hours = 0, minutes = 0] = timeValue.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${padTimePart(minutes)} ${period}`;
}

export function TimeInput({
  className,
  disabled,
  onBlur,
  onKeyDown,
  onValueCommit,
  onValueChange,
  value,
  ...props
}: TimeInputProps) {
  const [prevValue, setPrevValue] = React.useState(value);
  const [invalid, setInvalid] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState(() =>
    formatTime(value),
  );

  if (value !== prevValue) {
    setPrevValue(value);
    setInvalid(Boolean(String(value ?? "").trim()) && !parseTimeValue(value));
    setDisplayValue(formatTime(value));
  }

  function commitValue() {
    const timeValue = parseTimeValue(displayValue);
    const nextValue = timeValue || displayValue;
    const hasInvalidValue = Boolean(displayValue.trim()) && !timeValue;

    onValueChange?.(nextValue);
    onValueCommit?.();
    setInvalid(hasInvalidValue);
    setDisplayValue(timeValue ? formatTime(timeValue) : nextValue);
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2 z-10 flex size-5 -translate-y-1/2 items-center justify-center">
        <Clock
          className={twMerge("text-gray-800", invalid && "text-red-600")}
        />
      </span>
      <Input
        {...props}
        disabled={disabled}
        type="text"
        inputMode="text"
        className={twMerge("pl-9", className)}
        aria-invalid={invalid || props["aria-invalid"]}
        value={displayValue}
        onChange={(event) => {
          setInvalid(false);
          setDisplayValue(event.target.value);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (!event.defaultPrevented && event.key === "Enter") {
            event.preventDefault();
            commitValue();
          }
        }}
        onBlur={(event) => {
          commitValue();
          onBlur?.(event);
        }}
      />
    </div>
  );
}
