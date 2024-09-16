import React, { forwardRef } from "react";

import useField from "./useField";

import Field from "./Field";

const TextArea = (props, ref) => {
  const field = useField(props, ref);

  return (
    <Field field={field}>
      <textarea
        {...field.props}
        className="textarea"
        value={field.value}
        ref={field.ref}
      />
    </Field>
  );
};

TextArea.displayName = "TextArea";
export default forwardRef(TextArea);
