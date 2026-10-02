"use client";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { cn } from "@kenstack/lib/utils";

type InputProps = FieldProps &
  React.ComponentProps<"textarea"> & {
    inputClass?: string;
    maxLength?: number;
  };

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-16 w-full rounded-[var(--input-radius,var(--radius))] border bg-[color:var(--input-background,transparent)] px-2.5 py-2 text-base transition-colors outline-none placeholder:text-[color:var(--input-placeholder,var(--muted-foreground))] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm dark:bg-[color:var(--input-background,color-mix(in_oklab,var(--input)_30%,transparent))]",
        className,
      )}
      {...props}
    />
  );
}

export default function TextareaField({
  name,
  label,
  description,
  inputClass,
  maxLength,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      description={description}
      render={({ field }) => (
        <div>
          <FormControl>
            <Textarea
              {...props}
              {...field}
              className={inputClass}
              maxLength={maxLength}
            />
          </FormControl>
          {maxLength && (
            <div className="text-xs">
              {field.value?.length ?? 0} of {maxLength.toLocaleString()}
            </div>
          )}
        </div>
      )}
    />
  );
}
