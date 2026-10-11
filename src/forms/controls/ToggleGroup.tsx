"use client";

import * as React from "react";

import { FieldLockedContext } from "@kenstack/forms/fieldLocked";
import Link from "next/link";

import { cn } from "@kenstack/lib/utils";

type ToggleGroupOption<TValue extends string = string> = {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: TValue;
  // Makes the option a link to another view, such as one theatre's calendar, marked current when chosen.
  href?: string;
};

type ToggleGroupProps<TOption extends ToggleGroupOption = ToggleGroupOption> =
  Omit<React.ComponentPropsWithRef<"div">, "onChange" | "role"> & {
    // Restyles each option, keeping its behaviour.
    itemClassName?: string;
    options: readonly TOption[];
    value: string;
    onValueChange?: (value: TOption["value"], option: TOption) => void;
    // The group's name for assistive technology. In a form field, the fieldset's legend names the
    // choice, so the field passes none.
    label?: string;
    disabled?: boolean;
    name?: string;
  };

// One choice among several, shown as a row of on/off buttons. Options are radio buttons, so the arrow
// keys move between them; options with an `href` are links instead, so a server page can switch views.
function ToggleGroup<TOption extends ToggleGroupOption = ToggleGroupOption>({
  className,
  disabled,
  itemClassName,
  label,
  name,
  options,
  value,
  onValueChange,
  ...props
}: ToggleGroupProps<TOption>) {
  const locked = React.useContext(FieldLockedContext);
  const generatedName = React.useId();
  const isNavigation = options.some((option) => option.href !== undefined);

  return (
    <div
      role={label ? (isNavigation ? "group" : "radiogroup") : undefined}
      aria-label={label}
      className={cn("flex flex-wrap gap-1", className)}
      {...props}
    >
      {options.map((option) => {
        const { icon: Icon, href } = option;
        const content = (
          <>
            {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
            {option.label}
          </>
        );

        if (href !== undefined) {
          return (
            <Link
              key={option.value}
              href={href}
              aria-current={option.value === value ? "true" : undefined}
              className={cn("toggle", itemClassName)}
            >
              {content}
            </Link>
          );
        }

        return (
          <label key={option.value} className="inline-flex">
            <input
              type="radio"
              name={name ?? generatedName}
              value={option.value}
              checked={option.value === value}
              disabled={disabled || locked}
              className="sr-only"
              onChange={() => onValueChange?.(option.value, option)}
            />
            <span className={cn("toggle", itemClassName)}>{content}</span>
          </label>
        );
      })}
    </div>
  );
}

export { ToggleGroup };
