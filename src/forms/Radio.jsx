import React from "react";

import useField from "./useField";

import Radio from "./base/Radio";
import Field from "./Field";

export default function RadioField(props) {
  const inputRef = React.useRef();
  const field = useField(props, inputRef);

  let { row = false, options = [], ...rest } = field.props;

  let classes = "";
  if (row) {
    classes = typeof row === "string" ? " radio-row-" + row : " radio-row-xs";
  }

  return (
    <Field field={field}>
      <ul className={"radio-list " + classes}>
        {options.map(([_value, _label], key) => {
          const id = field.props.id + "-" + _value;
          return (
            <li key={_value}>
              <Radio
                row={row}
                value={_value}
                ref={key === 0 ? inputRef : undefined}
                {...rest}
                id={id}
                checked={field.value === String(_value)}
                label={_label}
              />
            </li>
          );
        })}
      </ul>
    </Field>
  );
}
