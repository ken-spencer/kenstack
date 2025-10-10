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

export type CheckboxListOptions = [key: string, label: string][];

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
          {options.map(([key, text]) => (
            <FormField
              key={key}
              control={control}
              name={name}
              render={({ field }) => (
                <FormItem
                  key={key}
                  className="flex flex-row items-center gap-2"
                >
                  <FormControl>
                    <Checkbox
                      {...field}
                      value={key}
                      checked={field.value.includes(key)}
                      onCheckedChange={(checked) => {
                        if (readOnly) {
                          return;
                        }
                        return checked
                          ? field.onChange([...field.value, key])
                          : field.onChange(
                              field.value?.filter((value) => value !== key)
                            );
                      }}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">{text}</FormLabel>
                </FormItem>
              )}
            />
          ))}
        </div>
      )}
    />
  );
}
