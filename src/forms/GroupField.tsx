"use client";

import type { ReactNode } from "react";

import Field, {
  FormControl,
  type FieldProps,
  type RenderProps,
} from "@kenstack/forms/Field";
import { cn } from "@kenstack/lib/utils";

// A field whose control is a set of buttons or other elements sharing one
// value, such as a choice between plans. The fieldset carries the field's
// ref and ids, so an invalid group receives focus and its error message.
export default function GroupField({
  className,
  description,
  help,
  label,
  legendClassName,
  name,
  render,
}: FieldProps & {
  className?: string;
  legendClassName?: string;
  render: (props: RenderProps) => ReactNode;
}) {
  return (
    <Field
      name={name}
      help={help}
      description={description}
      className={className}
      render={(props) => (
        <FormControl>
          <fieldset ref={props.field.ref} tabIndex={-1}>
            {label ? (
              <legend
                className={cn(
                  "text-sm leading-none font-medium",
                  legendClassName,
                )}
              >
                {label}
              </legend>
            ) : null}
            {render(props)}
          </fieldset>
        </FormControl>
      )}
    />
  );
}
