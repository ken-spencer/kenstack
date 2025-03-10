import useField from "../useField";

import Field from "../Field";
import Input from "../base/Input";

export default function InputField({ type, start, end, ...initialProps }) {
  const { field, props, fieldProps } = useField(initialProps);

  if (type) {
    throw Error(`Invalid prop type with value ${type} on field ${field.name}`);
  }

  return (
    <Field {...fieldProps}>
      <Input {...props} value={field.value} start={start} end={end} />
    </Field>
  );
}

InputField.defaultValue = "";
