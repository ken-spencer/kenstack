import Button from "@kenstack/components/Button";
import { useFormContext } from "react-hook-form";

export default function SubmitButton({ children = "Submit", ...props }) {
  const {
    formState: { isSubmitting },
  } = useFormContext();

  return (
    <Button name="foo" value="bar" {...props} isPending={isSubmitting}>
      {children}
    </Button>
  );
}
