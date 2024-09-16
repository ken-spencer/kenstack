import { lazy, Suspense, forwardRef } from "react";

import omit from "lodash/omit";

//const Spinner = lazy(() => import("./Spinner"));
const Spinner = lazy(() => import("@mui/icons-material/Autorenew"));

const Button = (
  {
    loading = null,
    startIcon = null,
    endIcon = null,
    className = null,
    children,
    type = "button",
    color = null,
    component: Component = "button",
    ...props
  },
  ref,
) => {
  let classes = "button";

  if (loading === true || (loading === false && !startIcon)) {
    if (loading === true) {
      props.disabled = true;
    }
    classes += " is-loading";
    startIcon = (
      <Suspense>
        <Spinner
          className="button-spinner"
          style={{ visibility: loading ? "visible" : "hidden" }}
        />
      </Suspense>
    );
  }

  if (loading !== null && !endIcon) {
    endIcon = <span />;
  }

  // get same appearance as :disabled when not a button
  if (props.disabled && Component !== "button") {
    classes += " disabled";
    props = omit(props, ["href", "onClick", "disabled"]);
  }

  if (startIcon) {
    classes += " has-start-icon";
    /*
    if (typeof startIcon === "function") {
      const StartIcon = lazy(startIcon);
      startIcon = (
        <Suspense>
          <StartIcon />
        </Suspense>
      );
    }
    */
  }

  switch (color) {
    case "error":
      classes += " button-error";
      break;
    case "cancel":
      classes += " button-cancel";
      break;
  }

  if (endIcon) {
    classes += " has-end-icon";
  }

  if (className) {
    classes += " " + className;
  }

  return (
    <Component type={type} className={classes} ref={ref} {...props}>
      {startIcon && <span className="start-icon-span">{startIcon}</span>}
      {children}
      {endIcon && <span className="end-icon-span">{endIcon}</span>}
    </Component>
  );
};

Button.displayName = "Button";
export default forwardRef(Button);
