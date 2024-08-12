import React, { forwardRef } from "react";

import useField from "./useField";

import Field from "./Field";
import Input from "./base/Input";

const InputField = ({ start, end, ...initialProps }, ref) => {
  const field = useField(initialProps, ref);

  return (
    <Field field={field}>
      <Input
        {...field.props}
        value={field.value}
        start={start}
        end={end}
        ref={field.ref}
      />
    </Field>
  );
};

InputField.displayName = "InputField";
export default forwardRef(InputField);
