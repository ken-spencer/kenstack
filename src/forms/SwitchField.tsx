"use client";

import Field, { FormControl, type FieldProps } from "@kenstack/forms/Field";
import { cn } from "@kenstack/lib/utils";

type SwitchFieldProps = FieldProps & {
  className?: string;
};

function Switch({
  checked = false,
  className,
  onCheckedChange,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
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

export default function SwitchField({
  name,
  label,
  description,
  className,
}: SwitchFieldProps) {
  return (
    <Field
      name={name}
      description={description}
      className={className}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
          <label className="gap-3 text-lg select-text">{label}</label>
        </div>
      )}
    />
  );
}
