import Button from "@kenstack/components/Button";
import { useForm } from "@kenstack/forms/context";
import { useFormContext } from "react-hook-form";

export default function SubmitButton({
  children = "Submit",
  disabledUntilDirty = false,
  ...props
}) {
  const {
    formState: { isDirty, isSubmitting },
  } = useFormContext();
  const { uploadingFields } = useForm();

  return (
    <Button
      {...props}
      disabled={
        props.disabled ||
        (disabledUntilDirty && !isDirty) ||
        uploadingFields.size > 0
      }
      isPending={isSubmitting}
    >
      {children}
    </Button>
  );
}
