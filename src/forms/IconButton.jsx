import { forwardRef } from "react";

import styles from "./Button/button.module.scss";

const IconButton = ({ children, className = "", ...props }, ref) => {
  return (
    <button
      className={styles.iconButton + (className ? " " + className : "")}
      {...props}
      ref={ref}
    >
      {children}
    </button>
  );
};

IconButton.displayName = "IconButton";
export default forwardRef(IconButton);
