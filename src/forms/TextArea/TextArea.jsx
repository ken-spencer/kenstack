import React from "react";

import useField from "../useField";

import Field from "../Field";

export default function TextArea(initialProps) {
  const { field, props, fieldProps } = useField(initialProps);

  return (
    <Field field={field} {...fieldProps}>
      <textarea
        {...props}
        className="textarea"
        value={field.value}
        // ref={field.ref}
      />
    </Field>
  );
}
