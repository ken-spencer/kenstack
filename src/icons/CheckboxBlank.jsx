import * as React from "react";
const SvgCheckboxBlank = (props) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    tabIndex={-1}
    width="24"
    height="24"
    fill="currentColor"
    {...props}
  >
    <path d="M19 5v14H5V5zm0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2" />
  </svg>
);
export default SvgCheckboxBlank;
