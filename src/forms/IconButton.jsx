import { forwardRef } from "react";

const IconButton = ({ children, className = "", ...props }, ref) => {
  return (
    <button
      className={"icon-button" + (className ? " " + className : "")}
      {...props}
      ref={ref}
    >
      {children}
    </button>
  );
};

IconButton.displayName = "IconButton";
export default forwardRef(IconButton);
