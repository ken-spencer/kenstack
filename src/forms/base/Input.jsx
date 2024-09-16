import React, { forwardRef } from "react";

const Input = ({ start, end, className, ...props }, ref) => {
  if (start || end) {
    return (
      <label className={"label-input" + (className ? " " + className : "")}>
        {start && <span className="start">{start}</span>}
        <input {...props} ref={ref} />
        {end && <span className="end">{end}</span>}
      </label>
    );
  }
  return (
    <input
      {...props}
      className={"input" + (className ? " " + className : "")}
      ref={ref}
    />
  );
};

Input.displayName = "Input";
export default forwardRef(Input);
