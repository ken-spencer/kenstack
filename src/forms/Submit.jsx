import useForm from "./useForm";

import Button from "./Button";
import { useFormStatus } from "react-dom";

export default function Submit({
  disabled,
  mode = "nonde", // valid | none
  // variant = "contained",
  // size = "large",
  children = "Submit",
  ...props
}) {
  const form = useForm();
  const { invalid } = form;
  const { pending } = useFormStatus();

  if (mode === "valid") {
    disabled = invalid;
  }

  return (
    <Button
      type="submit"
      disabled={form.disabled || form.pending || pending || disabled}
      {...props}
    >
      {children}
    </Button>
  );
}
