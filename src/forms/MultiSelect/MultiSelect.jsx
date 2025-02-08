import React from "react";

import useField from "../useField";
import Field from "../Field";
import Dialog from "./Dialog";

import AddIcon from "@kenstack/icons/Add";

export default function MultiSelect(initialProps) {
  const inputRef = React.useRef();
  const dialogRef = React.useRef(null);
  const { field, props, fieldProps } = useField(initialProps, inputRef);

  return (
    <Field field={field} {...fieldProps}>
      <div className="relative">
        <Dialog />
      </div>
      <div>
        <button
          className="flex gap-1"
          type="button"
        >
          <AddIcon />
          Add
        </button>
      </div>
    </Field>
  );
}
