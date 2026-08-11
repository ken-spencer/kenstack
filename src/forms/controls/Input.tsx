import * as React from "react";

import { cn } from "@kenstack/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  endAdornment?: React.ReactNode;
  startAdornment?: React.ReactNode;
};

function Input({
  className,
  endAdornment,
  startAdornment,
  type,
  ...props
}: InputProps) {
  const hasStartAdornment = startAdornment != null && startAdornment !== false;
  const hasEndAdornment = endAdornment != null && endAdornment !== false;
  const input = (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-8 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm",
        hasStartAdornment && "ps-9",
        hasEndAdornment && "pe-9",
        className,
      )}
      {...props}
    />
  );

  if (!hasStartAdornment && !hasEndAdornment) {
    return input;
  }

  return (
    <div className="relative w-full min-w-0" data-slot="input-container">
      {input}
      {hasStartAdornment ? (
        <span className="absolute inset-y-0 start-2 z-10 flex items-center">
          {startAdornment}
        </span>
      ) : null}
      {hasEndAdornment ? (
        <span className="absolute inset-y-0 end-2 z-10 flex items-center">
          {endAdornment}
        </span>
      ) : null}
    </div>
  );
}

export { Input };
