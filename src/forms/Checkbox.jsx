import { useCallback } from "react";

import Field from "./Field";
import Checkbox from "./base/Checkbox";

import useField from "./useField";

export default function CheckboxField({ onChange, ...initialProps }) {
  // const inputRef = React.useRef();
  const { field, props, fieldProps } = useField(initialProps);
  // let { name, label, helperText } = field.props;

  const handleChange = useCallback(
    (evt) => {
      if (onChange) {
        onChange(evt);
      }
      const input = evt.target;
      field.setValue(input.checked);
    },
    [onChange, field],
  );

  return (
    <Field {...fieldProps} label={false}>
      <Checkbox
        {...props}
        checked={field.value}
        label={field.label}
        onChange={handleChange}
      />
    </Field>
  );
}
