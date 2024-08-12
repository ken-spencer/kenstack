import React from "react";

import Field from "./Field";
import Checkbox from "./base/Checkbox";

import useField from "./useField";

export default function CheckboxField(props) {
  const inputRef = React.useRef();
  const field = useField(props, inputRef);
  // let { name, label, helperText } = field.props;

  return (
    <Field field={field} label={null}>
      <Checkbox {...field.props} label={field.label} />
    </Field>
  );

  /*
  return (
    <div className={styles.inlineFlex + " " + styles.flexWrap}>
      <label className={styles.checkbox}>
        <input
          {...field.props}
          type="checkbox"
          checked={field.value || false}
        />
        <span>
          <CheckIcon width="0.874rem" height="0.874rem" />
        </span>
      </label>
      <Label field={field} />
      <Error field={field} />
    </div>
  );
  */
}
