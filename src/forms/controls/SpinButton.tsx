"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@kenstack/lib/utils";

type SpinButtonProps = Omit<
  React.ComponentProps<"div">,
  "aria-label" | "onBlur" | "onChange"
> & {
  "aria-label": string;
  decrementLabel?: string;
  disabled?: boolean;
  incrementLabel?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  max?: number;
  min?: number;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onValueChange: (value: number | null) => void;
  step?: number;
  value: number | null;
};

function clamp(value: number, min?: number, max?: number) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value));
}

export default function SpinButton({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  decrementLabel = "Decrease value",
  disabled = false,
  id: idProp,
  incrementLabel = "Increase value",
  inputRef,
  max,
  min = 0,
  name,
  onBlur,
  onValueChange,
  step = 1,
  value,
  ...props
}: SpinButtonProps) {
  const generatedId = React.useId();
  const id = idProp ?? generatedId;
  const decrementDisabled =
    disabled || value === null || (min !== undefined && value <= min);
  const incrementDisabled =
    disabled || (value !== null && max !== undefined && value >= max);

  function changeBy(change: number) {
    onValueChange(clamp((value ?? 0) + change, min, max));
  }

  return (
    <div
      {...props}
      className={cn(
        "border-input bg-background inline-flex shrink-0 items-center rounded-lg border",
        className,
      )}
    >
      <button
        aria-controls={id}
        aria-disabled={decrementDisabled}
        aria-label={decrementLabel}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex size-11 items-center justify-center rounded-l-lg transition-colors focus-visible:ring-2 focus-visible:outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50"
        onClick={() => {
          if (!decrementDisabled) {
            changeBy(-step);
          }
        }}
        tabIndex={-1}
        title={decrementLabel}
        type="button"
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <input
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className="border-input h-11 w-14 [appearance:textfield] border-x bg-transparent px-1 text-center text-base font-black tabular-nums outline-none focus:bg-black/5 focus-visible:ring-2 focus-visible:ring-inset dark:focus:bg-white/5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={disabled}
        id={id}
        inputMode={Number.isInteger(step) ? "numeric" : "decimal"}
        max={max}
        min={min}
        name={name}
        onBlur={onBlur}
        onChange={(event) => {
          const next = event.currentTarget.value;
          const number = Number(next);

          if (next === "") {
            onValueChange(null);
          } else if (Number.isFinite(number)) {
            onValueChange(clamp(number, min, max));
          }
        }}
        ref={inputRef}
        step={step}
        type="number"
        value={value ?? ""}
      />
      <button
        aria-controls={id}
        aria-disabled={incrementDisabled}
        aria-label={incrementLabel}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex size-11 items-center justify-center rounded-r-lg transition-colors focus-visible:ring-2 focus-visible:outline-none aria-disabled:pointer-events-none aria-disabled:opacity-50"
        onClick={() => {
          if (!incrementDisabled) {
            changeBy(step);
          }
        }}
        tabIndex={-1}
        title={incrementLabel}
        type="button"
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
