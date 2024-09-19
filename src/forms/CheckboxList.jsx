import React from "react";

import useField from "./useField";

import Checkbox from "./base/Checkbox";
import Field from "./Field";

export default function CheckboxList(props) {
  const inputRef = React.useRef();
  const field = useField(props, inputRef);

  let {
    row = false,
    listClass = "",
    options = [],
    name,
    ...rest
  } = field.props;

  // fix client side validation as not designed to work with lists of checkboxes.
  delete rest.required;

  let classes = "";
  if (row) {
    classes = typeof row === "string" ? " radio-row-" + row : " radio-row-xs";
  }

  return (
    <Field field={field}>
      <ul className={listClass ? listClass : "radio-list" + classes}>
        {options.map(([value, label], key) => {
          const id = field.props.id + "-" + value;
          value = String(value);
          return (
            <li key={value}>
              <Checkbox
                // row={row}
                name={name /*+ "[]"*/}
                value={value}
                ref={key === 0 ? inputRef : undefined}
                {...rest}
                id={id}
                checked={field?.value.includes(value)}
                label={label}
              />
            </li>
          );
        })}
      </ul>
    </Field>
  );
}
