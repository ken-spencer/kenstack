import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@kenstack/components/Button";
import { PopoverTrigger } from "@kenstack/components/Popover";

export default function DatePickerTrigger({
  className,
  disabled,
}: {
  className?: string;
  disabled?: boolean;
}) {
  // The adjacent text input is the keyboard-accessible date control.
  return (
    <PopoverTrigger asChild>
      <Button
        type="button"
        disabled={disabled}
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
