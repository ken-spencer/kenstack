import React from "react";

import Field from "./Field";
import Checkbox from "./base/Checkbox";

import useField from "./useField";

export default function CheckboxField(props) {
  const inputRef = React.useRef();
  const field = useField(props, inputRef);
  // let { name, label, helperText } = field.props;

  return (
    <Field field={field} label={null}>
      <Checkbox {...field.props} label={field.label} />
    </Field>
  );
}
