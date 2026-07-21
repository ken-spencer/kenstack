"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { parseDate } from "chrono-node";
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

function formatDate(date: string | Date) {
  return format(date, "MMMM d, yyyy '@' h:mm a");
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

    const result = newDate instanceof Date ? newDate : parseDate(newDate);

    if (!result) {
      setFormValue(name, "", { shouldDirty: true, shouldTouch: true });
      setValue("");
      return;
    }

    setFormValue(name, result.toISOString(), {
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
              suppressHydrationWarning
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
    () => (value ? (parseDate(value) ?? undefined) : undefined),
    [value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <DatePickerTrigger className="absolute" disabled={disabled} />
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
