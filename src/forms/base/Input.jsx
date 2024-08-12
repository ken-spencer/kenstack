import React, { forwardRef } from "react";

import styles from "../form.module.scss";

const Input = ({ start, end, className, ...props }, ref) => {
  if (start || end) {
    return (
      <label className={styles.labelInput + (className ? " " + className : "")}>
        {start && <span className={styles.start}>{start}</span>}
        <input {...props} ref={ref} />
        {end && <span className={styles.end}>{end}</span>}
      </label>
    );
  }
  return (
    <input
      {...props}
      className={styles.input + (className ? " " + className : "")}
      ref={ref}
    />
  );
};

Input.displayName = "Input";
export default forwardRef(Input);
