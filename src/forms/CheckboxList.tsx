"use client";

import { twMerge } from "tailwind-merge";
import Field, { type FieldProps } from "@kenstack/forms/Field";
import { Checkbox } from "@kenstack/components/ui/checkbox";
import {
  FormControl,
  FormLabel,
  FormItem,
  FormField,
} from "@kenstack/components/ui/form";

import { useFormContext } from "react-hook-form";

export type CheckboxListOptions = readonly {
  label: string;
  value: string;
}[];

type InputProps = FieldProps &
  React.ComponentProps<"input"> & {
    inputClass?: string;
    grid?: string;
    options: CheckboxListOptions;
  };

export default function CheckboxField({
  name,
  label,
  description,
  grid = "",
  options = [],
  readOnly,
}: InputProps) {
  const { control } = useFormContext();

  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={() => (
        <div className={twMerge("grid grid-cols-2 gap-4", grid)} tabIndex={-1}>
          {options.map((option) => (
            <FormField
              key={option.value}
              control={control}
              name={name}
              render={({ field }) => (
                <FormItem
                  key={option.value}
                  className="flex flex-row items-center gap-2"
                >
                  <FormControl>
                    <Checkbox
                      {...field}
                      value={option.value}
                      checked={field.value.includes(option.value)}
                      onCheckedChange={(checked) => {
                        if (readOnly) {
                          return;
                        }
                        return checked
                          ? field.onChange([...field.value, option.value])
                          : field.onChange(
                              field.value?.filter(
                                (value: string) => value !== option.value,
                              ),
                            );
                      }}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">
                    {option.label}
                  </FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      )}
    />
  );
}
