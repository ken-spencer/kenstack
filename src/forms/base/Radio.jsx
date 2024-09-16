import React, { forwardRef } from "react";

import CircleIcon from "../icons/Circle";

function Radio({ label, id, ...props }, ref) {
  return (
    <div className="flex items-center">
      <label className="radio">
        <input {...props} ref={ref} id={id} type="radio" />
        <CircleIcon className="check" width="0.875rem" height="0.875rem" />
      </label>
      <label className="label" htmlFor={id}>
        {label}
      </label>
    </div>
  );
}

// Radio.displayName = "Radio";
export default forwardRef(Radio);
