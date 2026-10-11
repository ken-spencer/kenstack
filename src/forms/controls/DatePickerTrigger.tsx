"use client";

import { useContext } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import { PopoverTrigger } from "@kenstack/components/Popover";
import { FieldLockedContext } from "@kenstack/forms/fieldLocked";

export default function DatePickerTrigger({
  className,
  disabled,
}: {
  className?: string;
  disabled?: boolean;
}) {
  const locked = useContext(FieldLockedContext);
  // The adjacent text input is the keyboard-accessible date control.
  return (
    <PopoverTrigger asChild>
      <Button
        type="button"
        disabled={disabled || locked}
        tabIndex={-1}
        variant="ghost"
        size="icon"
        className={className}
      >
        <CalendarIcon aria-hidden="true" />
        <span className="sr-only">Pick a date</span>
      </Button>
    </PopoverTrigger>
  );
}
