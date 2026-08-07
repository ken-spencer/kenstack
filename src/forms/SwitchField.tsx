"use client";

import Field, { FormControl } from "@kenstack/forms/Field";
import Help from "@kenstack/components/Help";
import type { CheckedFieldProps } from "@kenstack/forms/CheckboxField";
import { cn } from "@kenstack/lib/utils";

export function Switch({
  checked = false,
  className,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (isChecked: boolean) => void;
}) {
  const state = checked ? "checked" : "unchecked";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-slot="switch"
      data-state={state}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={() => {
        onCheckedChange?.(!checked);
      }}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        className="bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
        data-state={state}
      />
    </button>
  );
}

type InputProps = CheckedFieldProps &
  Omit<React.ComponentProps<typeof Switch>, "checked" | "onCheckedChange">;

// SwitchField is the switch presentation of CheckboxField. Keep their value
// semantics and form behavior aligned; CheckedFieldProps enforces the shared API.
export default function SwitchField({
  checked = true,
  name,
  label,
  help,
  description,
  className,
  inputClass,
  unchecked = false,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      description={description}
      className={className}
      render={({ field }) => (
        <label className="flex items-center gap-3 text-lg select-text">
          <FormControl>
            <Switch
              {...props}
              className={inputClass}
              name={field.name}
              ref={field.ref}
              checked={field.value === checked}
              onBlur={field.onBlur}
              onCheckedChange={(isChecked) => {
                field.onChange(isChecked === true ? checked : unchecked);
                field.onBlur();
              }}
            />
          </FormControl>
          {label}
          {help ? <Help message={help} /> : null}
        </label>
      )}
    />
  );
}
