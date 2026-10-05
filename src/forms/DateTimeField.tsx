"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { parse } from "chrono-node";
import { TZDate } from "react-day-picker";
import deps from "@app/deps";
import { twMerge } from "tailwind-merge";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";
import DatePickerTrigger from "@kenstack/forms/controls/DatePickerTrigger";
import { Calendar } from "@kenstack/components/Calendar";
import { Popover, PopoverContent } from "@kenstack/components/Popover";

type InputProps = FieldProps &
  React.ComponentProps<"input"> & {
    inputClass?: string;
  };

// "at" survives a round trip through the parser; "@" made it drop the time.
function formatDate(date: string | Date) {
  return format(
    new TZDate(new Date(date), deps.defaultTimeZone),
    "MMMM d, yyyy 'at' h:mm a",
  );
}

function parseFormDate(value: string) {
  const now = new TZDate(Date.now(), deps.defaultTimeZone);
  const result = parse(value, {
    instant: new Date(now),
    timezone: -now.getTimezoneOffset(),
  })[0];
  if (!result) {
    return null;
  }
  if (result.start.isCertain("timezoneOffset")) {
    return result.date();
  }
  const date = new Date(
    result.date().getTime() - now.getTimezoneOffset() * 60_000,
  );
  return new TZDate(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
    deps.defaultTimeZone,
  );
}

function formatFormValue(value: unknown) {
  return value ? formatDate(value instanceof Date ? value : String(value)) : "";
}

export default function DateTimeField({
  name,
  label,
  help,
  description,
  className,
  inputClass,
  disabled,
  ...props
}: InputProps) {
  const { watch, getValues, setValue: setFormValue } = useFormContext();
  const [prevFormValue, setPrevFormValue] = useState(getValues(name));
  const [value, setValue] = useState(() => formatFormValue(getValues(name)));

  const formValue = watch(name);
  if (formValue !== prevFormValue) {
    setPrevFormValue(formValue);
    setValue(formatFormValue(formValue));
  }

  const handleDate = (newDate: string | Date) => {
    if (!newDate) {
      setFormValue(name, "", { shouldDirty: true, shouldTouch: true });
      setValue("");
      return;
    }

    const result = newDate instanceof Date ? newDate : parseFormDate(newDate);

    if (!result) {
      setFormValue(name, "", { shouldDirty: true, shouldTouch: true });
      setValue("");
      return;
    }

    setFormValue(name, new Date(result).toISOString(), {
      shouldDirty: true,
      shouldTouch: true,
    });
    setValue(formatDate(result));
  };

  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="relative flex items-center">
          <DatePicker
            disabled={disabled}
            handleDate={handleDate}
            value={value}
          />
          <FormControl>
            <Input
              {...field}
              placeholder="eg: Jan 27 or Next Thursday"
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
                // Only typed text needs parsing; leaving an untouched field
                // must not rewrite its value or mark the form dirty.
                if (value !== formatFormValue(getValues(name))) {
                  handleDate(value);
                }
              }}
            />
          </FormControl>
        </div>
      )}
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
    () => (value ? (parseFormDate(value) ?? undefined) : undefined),
    [value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <DatePickerTrigger className="absolute" disabled={disabled} />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          timeZone={deps.defaultTimeZone}
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
