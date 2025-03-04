import useField from "./useField";

import Field from "./Field";
import Input from "./base/Input";

export default function InputField(initialProps) {
  // Memoize this so useField doesn't internally rerender
  const { start, end, ...rest } = initialProps;
  const { field, props, fieldProps } = useField(rest);

  return (
    <Field {...fieldProps}>
      <Input {...props} value={field.value} start={start} end={end} />
    </Field>
  );
}
