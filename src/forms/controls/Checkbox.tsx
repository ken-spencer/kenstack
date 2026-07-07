"use client";

import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@kenstack/lib/utils";

type CheckedState = boolean | "indeterminate";

type CheckboxProps = Omit<
  React.ComponentPropsWithRef<"input">,
  "checked" | "defaultChecked" | "onChange" | "type"
> & {
  checked?: CheckedState;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onCheckedChange?: (checked: CheckedState) => void;
};

function Checkbox({
  className,
  checked = false,
  onChange,
  onCheckedChange,
  ref,
  ...props
}: CheckboxProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setRef = React.useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input;

      if (typeof ref === "function") {
        ref(input);
      } else if (ref) {
        ref.current = input;
      }
    },
    [ref],
  );
  const dataState =
    checked === "indeterminate"
      ? "indeterminate"
      : checked
        ? "checked"
        : "unchecked";

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = checked === "indeterminate";
    }
  }, [checked]);

  return (
    <span className="relative inline-grid size-4 shrink-0">
      <input
        type="checkbox"
        aria-checked={checked === "indeterminate" ? "mixed" : checked}
        checked={checked === true}
        data-slot="checkbox"
        data-state={dataState}
        ref={setRef}
        className={cn(
          "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive col-start-1 row-start-1 size-4 shrink-0 appearance-none rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onChange={(event) => {
          onChange?.(event);

          if (event.defaultPrevented) {
            return;
          }

          const nextChecked = event.currentTarget.checked;
          onCheckedChange?.(nextChecked);
        }}
        {...props}
      />
      <span
        data-slot="checkbox-indicator"
        data-state={dataState}
        className="pointer-events-none col-start-1 row-start-1 flex items-center justify-center text-current transition-none"
      >
        {checked === "indeterminate" ? (
          <MinusIcon className="size-3.5" />
        ) : checked ? (
          <CheckIcon className="size-3.5" />
        ) : null}
      </span>
    </span>
  );
}

export { Checkbox };
