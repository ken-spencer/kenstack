import * as React from "react";
const SvgCopy = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1000 1000"
    width="16"
    height="16"
    {...props}
  >
    <path d="M710 10H360c-38.6 0-70 31.4-70 70v630c0 38.6 31.4 70 70 70h490c38.6 0 70-31.4 70-70V220zm0 99 111 111H710zm140 601H360V80h280v210h210z" />
    <path d="M430 360h350v70H430zm0 140h350v70H430z" />
    <path d="M640 920H150V290h70v-70h-70c-38.6 0-70 31.4-70 70v630c0 38.6 31.4 70 70 70h490c38.6 0 70-31.4 70-70v-70h-70z" />
  </svg>
);
export default SvgCopy;
