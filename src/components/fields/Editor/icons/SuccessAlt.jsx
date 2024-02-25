import * as React from "react";
const SvgSuccessAlt = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 50 50"
    width="16"
    height="16"
    {...props}
  >
    <circle cx={25} cy={25} r={25} />
    <path
      fill="none"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={4}
      d="M38 15 22 33l-10-8"
    />
  </svg>
);
export default SvgSuccessAlt;
