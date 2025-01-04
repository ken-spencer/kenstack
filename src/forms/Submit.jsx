import { useForm } from "./context";

import Button from "./Button";
import { useFormStatus } from "react-dom";
import { useShallow } from "zustand/react/shallow";
// import ProgressIcon from "@kenstack/icons/Progress";

export default function Submit({
  disabled,
  mode = "none", // valid | none
  // variant = "contained",
  // size = "large",
  children = "Submit",
  className = "",
  ...props
}) {
  const state = useForm(
    useShallow((s) => ({
      invalid: s.invalid,
      disabled: s.disabled,
      pending: s.pending,
    })),
  );
  const { pending } = useFormStatus();
  const isPending = state.pending || pending;

  if (mode === "valid") {
    disabled = state.invalid;
  }

  let classes = className;
  if (isPending) {
    classes += (classes ? " " : "") + "pending";
  }

  return (
    <Button
      type="submit"
      disabled={state.disabled || isPending || disabled}
      className={classes}
      {...props}
    >
      {children}
    </Button>
  );
}
