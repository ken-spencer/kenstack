import React from "react";

import useField from "./useField";

import Radio from "./base/Radio";
import Field from "./Field";

import styles from "./form.module.scss";

export default function RadioField(props) {
  const inputRef = React.useRef();
  const field = useField(props, inputRef);

  let { row = false, options = [], ...rest } = field.props;

  return (
    <Field field={field}>
      <ul
        className={
          styles.radioList +
          " " +
          (row ? styles["radioRow" + row] || styles.radioRowxs : "")
        }
      >
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

  /*
  return (
    <div>
      <Label field={field} className={styles.mb} />
      <div className={styles["radioRow" + row] || null}>
        {options.map(([_value, _label], key) => {
          const id = field.id + "-" + _value;
          return (
            <div
              key={_value}
              className={styles.flex + " " + styles["option" + row] || ""}
            >
              <label className={styles.radio}>
                <input
                  value={_value}
                  disabled={disabled}
                  ref={key === 0 ? inputRef : undefined}
                  {...rest}
                  id={id}
                  checked={field.value === String(_value)}
                  type="radio"
                />
                <span>
                  <CircleIcon width="0.875rem" height="0.875rem" />
                </span>
              </label>
              <label className={styles.label} htmlFor={id}>
                {_label}
              </label>
            </div>
          );
        })}
      </div>
      <Error field={field} />
    </div>
  );
  */
}
