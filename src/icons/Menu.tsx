import * as React from "react";
const SvgMenu = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    tabIndex={-1}
    width="24"
    height="24"
    fill="currentColor"
    {...props}
  >
    <path d="M3 18h18v-2H3zm0-5h18v-2H3zm0-7v2h18V6z" />
  </svg>
);
export default SvgMenu;
