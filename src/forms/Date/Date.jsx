import useField from "../useField";

import Field from "../Field";
import Input from "../base/Input";

export default function DateField({ start, end, ...initialProps }) {
  const { field, props, fieldProps } = useField(initialProps);

  return (
    <Field {...fieldProps}>
      <Input
        {...props}
        value={field.value}
        start={start}
        end={end}
        type="date"
      />
    </Field>
  );
}

DateField.defaultValue = "";

DateField.initializeValue = (value) => {
  if (value) {
    return value.slice(0, 10);
  }
  return "";
};
