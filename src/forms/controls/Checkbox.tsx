"use client";

import * as React from "react";
import { CheckIcon, MinusIcon } from "lucide-react";

import { cn } from "@kenstack/lib/utils";

type CheckedState = boolean | "indeterminate";

type CheckboxProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "checked" | "defaultChecked" | "onChange" | "type"
> & {
  checked?: CheckedState;
  defaultChecked?: CheckedState;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onCheckedChange?: (checked: CheckedState) => void;
};

function getCheckedState(checked: CheckedState) {
  return checked === "indeterminate"
    ? "indeterminate"
    : checked
      ? "checked"
      : "unchecked";
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      className,
      checked,
      defaultChecked = false,
      onChange,
      onCheckedChange,
      ...props
    },
    forwardedRef,
  ) {
    const [uncontrolledChecked, setUncontrolledChecked] =
      React.useState(defaultChecked);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const checkedState = checked ?? uncontrolledChecked;
    const dataState = getCheckedState(checkedState);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = checkedState === "indeterminate";
      }
    }, [checkedState]);

    React.useEffect(() => {
      const form = inputRef.current?.form;

      if (!form || checked !== undefined) {
        return;
      }

      const handleReset = () => {
        setUncontrolledChecked(defaultChecked);
      };

      form.addEventListener("reset", handleReset);
      return () => {
        form.removeEventListener("reset", handleReset);
      };
    }, [checked, defaultChecked]);

    const setRef = React.useCallback(
      (input: HTMLInputElement | null) => {
        inputRef.current = input;

        if (typeof forwardedRef === "function") {
          forwardedRef(input);
        } else if (forwardedRef) {
          forwardedRef.current = input;
        }
      },
      [forwardedRef],
    );

    return (
      <span className="relative inline-grid size-4 shrink-0">
        <input
          type="checkbox"
          aria-checked={
            checkedState === "indeterminate" ? "mixed" : checkedState
          }
          checked={checkedState === true}
          data-slot="checkbox"
          data-state={dataState}
          ref={setRef}
          className={cn(
            "peer border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive col-start-1 row-start-1 size-4 shrink-0 appearance-none rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          onChange={(event) => {
            const nextChecked = event.currentTarget.checked;
            onChange?.(event);
            setUncontrolledChecked(nextChecked);
            onCheckedChange?.(nextChecked);
          }}
          {...props}
        />
        <span
          data-slot="checkbox-indicator"
          data-state={dataState}
          className="pointer-events-none col-start-1 row-start-1 flex items-center justify-center text-current transition-none"
        >
          {checkedState === "indeterminate" ? (
            <MinusIcon className="size-3.5" />
          ) : checkedState ? (
            <CheckIcon className="size-3.5" />
          ) : null}
        </span>
      </span>
    );
  },
);

export { Checkbox };
