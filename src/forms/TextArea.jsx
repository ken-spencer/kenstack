import React, { forwardRef } from "react";

import useField from "./useField";
import styles from "./form.module.scss";

import Field from "./Field";

const TextArea = (props, ref) => {
  const field = useField(props, ref);

  return (
    <Field field={field}>
      <textarea
        {...field.props}
        className={styles.textArea}
        value={field.value}
        ref={field.ref}
      />
    </Field>
  );
};

TextArea.displayName = "TextArea";
export default forwardRef(TextArea);
