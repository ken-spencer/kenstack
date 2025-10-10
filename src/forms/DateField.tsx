"use client";
import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { parseDate } from "chrono-node";

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

const formatDate = (date) => {
  return format(date, "MMMM d, yyyy '@' h:mm a");
};
export default function InputField({
  name,
  label,
  description,
  className,
  inputClass,
  ...props
}: InputProps) {
  const { getValues, setValue: setFormValue } = useFormContext();
  const [value, setValue] = useState(() => {
    const v = getValues(name);
    if (v) {
      return formatDate(v);
    }
    return "";
  });

  const handleDate = (newDate: string | Date) => {
    if (newDate) {
      const result =
        newDate instanceof Date ? newDate : (parseDate(newDate) ?? "");
      setFormValue(name, result, { shouldDirty: true, shouldTouch: true });
      setValue(formatDate(result || new Date()));
    } else {
      setFormValue(name, "", { shouldDirty: true, shouldTouch: true });
      setValue("");
    }
  };

  return (
    <Field
      name={name}
      label={label}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="relative flex items-center">
          <DatePicker handleDate={handleDate} value={value} />
          <FormControl>
            <Input
              {...field}
              placeholder="eg: Jan 27 or Next Thursday"
              {...props}
              className={twMerge("pl-9", inputClass)}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleDate(value);
                }
              }}
              onBlur={() => {
                handleDate(value);
              }}
            />
          </FormControl>{" "}
        </div>
      )}
    />
  );
}

function DatePicker({ handleDate, value }) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => (value ? new Date(value) : null), [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute"
          // data-empty={!date}
          // className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
        >
          <CalendarIcon />
          <span className="sr-only">Pick a date</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(v) => {
            handleDate(v);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
