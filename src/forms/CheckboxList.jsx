import React from "react";

import useField from "./useField";

import Checkbox from "./base/Checkbox";
import Field from "./Field";

export default function CheckboxList({ onChange, ...initialProps }) {
  const inputRef = React.useRef();
  const { field, props, fieldProps } = useField(initialProps, inputRef);

  let { row = false, listClass = "", options = [], name, ...rest } = props;

  const { setValue } = field;
  const handleChange = React.useCallback(
    (evt) => {
      if (onChange) {
        onChange(evt, field);
      }

      const input = evt.target;
      const value = field.value || [];
      if (value && !Array.isArray(value)) {
        throw Error("CheckboxList requires it's value to be an array");
      }
      if (input.checked) {
        if (!value.includes(input.value)) {
          setValue([...value, input.value]);
        }
      } else {
        setValue(value.filter((v) => v !== input.value));
      }
    },
    [setValue, field, onChange],
  );

  // } fix client side validation as not designed to work with lists of checkboxes.
  delete rest.required;

  let classes = "";
  if (row) {
    classes = typeof row === "string" ? " radio-row-" + row : " radio-row-xs";
  }

  return (
    <Field field={field} {...fieldProps}>
      <ul className={listClass ? listClass : "radio-list" + classes}>
        {options.map(([value, label], key) => {
          const id = props.id + "-" + value;
          value = String(value);
          return (
            <li key={value}>
              <Checkbox
                // row={row}
                name={name}
                value={value}
                ref={key === 0 ? inputRef : undefined}
                {...rest}
                id={id}
                checked={field.value ? field.value.includes(value) : false}
                label={label}
                onChange={handleChange}
              />
            </li>
          );
        })}
      </ul>
    </Field>
  );
}
