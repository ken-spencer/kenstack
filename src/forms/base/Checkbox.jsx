import React, { forwardRef } from "react";

import CheckIcon from "../icons/CheckIcon";

import styles from "../form.module.scss";

function Checkbox({ label, id, ...props }, ref) {
  return (
    <div className={styles.flex + " " + styles.flexWrap}>
      <label className={styles.checkbox}>
        <input {...props} id={id} type="checkbox" ref={ref} />
        <CheckIcon
          className={styles.check}
          width="0.874rem"
          height="0.874rem"
        />
      </label>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
    </div>
  );
}

// Checkbox.displayName = "Checkbox";
export default forwardRef(Checkbox);
