import { twMerge } from "tailwind-merge";
import { useMemo } from "react";

import HelpIcon from "@kenstack/icons/Help";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@kenstack/components/ui/popover";

export default function Field({ field, ...props }) {
  const {
    label,
    help,
    required = false,
    error = "",
    containerClass = "",
    htmlFor,
    labelClass = "",
    children,
  } = props;

  let classes = useMemo(
    () =>
      twMerge(
        "field flex flex-col gap-[1px]",
        required && "required",
        containerClass,
      ),
    [required, containerClass],
  );

  let classesLabel = useMemo(() => twMerge("label", labelClass), [labelClass]);

  return (
    <div className={classes}>
      {label && (
        <div className="flex gap-2 items-center">
          <label htmlFor={htmlFor} className={classesLabel}>
            {label}
          </label>
          {required && <span className="required">*</span>}
          {help && (
            <Popover>
              <PopoverTrigger className="cursor-pointer">
                <HelpIcon />
              </PopoverTrigger>
              <PopoverContent>{help}</PopoverContent>
            </Popover>
          )}
        </div>
      )}
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}
