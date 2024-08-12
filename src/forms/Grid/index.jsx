import React from "react";

import { useMemo } from "react";
import grid from "./grid.module.scss";
const empty = {};
export default function GridContainer({
  className,
  styles = empty,
  gap,
  ...props
}) {
  const classProp = (className ? className + " " : "") + grid.container;
  const styleProps = useMemo(
    () => ({ ...styles, "--grid-gap": gap }),
    [styles, gap],
  );

  return <div className={classProp} style={styleProps} {...props} />;
}
