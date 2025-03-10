import useField from "../useField";

import Field from "../Field";
import Input from "../base/Input";

export default function UrlField({ start, end, ...initialProps }) {
  const { field, props, fieldProps } = useField(initialProps);

  return (
    <Field {...fieldProps}>
      <Input
        {...props}
        value={field.value}
        start={start}
        end={end}
        type="url"
      />
    </Field>
  );
}

UrlField.defaultValue = "";
