import React, { forwardRef } from "react";

import CheckIcon from "../icons/CheckIcon";

function Checkbox({ label, id, ...props }, ref) {
  return (
    <div className="flex items-center flex-wrap">
      <label className="checkbox">
        <input {...props} id={id} type="checkbox" ref={ref} />
        <CheckIcon
          // className="check"
          width="0.874rem"
          height="0.874rem"
        />
      </label>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
    </div>
  );
}

// Checkbox.displayName = "Checkbox";
export default forwardRef(Checkbox);
