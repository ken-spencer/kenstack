"use client";

import Field, {
  FormControl,
  type FieldProps,
  type RenderProps,
} from "@kenstack/forms/Field";
import { Input } from "@kenstack/forms/controls/Input";

type InputProps = FieldProps &
  Omit<React.ComponentProps<typeof Input>, "onChange" | "onBlur"> & {
    inputClass?: string;
    onChange?: ({
      event,
      field,
    }: {
      event: React.ChangeEvent<HTMLInputElement>;
      field: RenderProps["field"];
    }) => void;
    onBlur?: ({
      event,
      field,
    }: {
      event: React.FocusEvent<HTMLInputElement>;
      field: RenderProps["field"];
    }) => void;
  };

export default function InputField({
  name,
  label,
  help,
  description,
  className,
  inputClass,
  type = "text",
  onChange,
  onBlur,
  ...props
}: InputProps) {
  return (
    <Field
      name={name}
      label={label}
      help={help}
      description={description}
      className={className}
      render={({ field }) => {
        const { value, ...controlField } = field;

        return (
          <FormControl>
            <Input
              {...props}
              className={inputClass}
              {...controlField}
              value={value ?? ""}
              type={type}
              onChange={(evt) => {
                if (onChange) {
                  onChange({ event: evt, field });
                } else if (type === "email") {
                  field.onChange(evt.target.value.toLowerCase().trim());
                } else {
                  field.onChange(evt.target.value);
                }
              }}
              onBlur={
                onBlur
                  ? (event) => {
                      onBlur({ event, field });
                      field.onBlur();
                    }
                  : field.onBlur
              }
            />
          </FormControl>
        );
      }}
    />
  );
}
