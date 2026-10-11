"use client";

import * as React from "react";

import { FieldLockedContext } from "@kenstack/forms/fieldLocked";

import { cn } from "@kenstack/lib/utils";

type ToggleButtonProps = Omit<
  React.ComponentPropsWithRef<"button">,
  "aria-pressed" | "onClick" | "type"
> & {
  pressed: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

// A button that is on or off, such as a quick filter. A choice of one among several is a ToggleGroup.
function ToggleButton({
  className,
  pressed,
  onPressedChange,
  ...props
}: ToggleButtonProps) {
  const locked = React.useContext(FieldLockedContext);
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn("toggle", className)}
      {...props}
      disabled={props.disabled || locked}
      // An aria-disabled button stays focusable, so it can say why it is unavailable, but does nothing.
      onClick={() => {
        if (
          props["aria-disabled"] !== true &&
          props["aria-disabled"] !== "true"
        ) {
          onPressedChange?.(!pressed);
        }
      }}
    />
  );
}

export { ToggleButton };
